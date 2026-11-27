#!/usr/bin/env bash
# Deploys the current git commit to the ask-ai-ui ECS Express service:
#
#   1. Builds the image from the committed files (not the working tree) and
#      pushes it to ECR, tagged with the commit hash.
#   2. Updates the service to run that image, which creates a new service
#      revision and starts a rolling deploy.
#   3. Waits for the deploy to finish.
#
# Run it from anywhere in the repo, with AWS credentials in the environment:
#
#   scripts/deploy.sh
#
# Every setting below can be overridden with an environment variable, so CI can
# run the same script. It never prompts, and running it twice for the same
# commit skips the build and the deploy.
#
# One-time setup: the service must already exist. It was created in Express
# Mode, which also sets up the load balancer, the public HTTPS endpoint, and
# autoscaling. Its container sets ASK_AI_API_URL to the API's private DNS name,
# http://api.ask-ai.internal:8000, and this script keeps every setting except
# the image. To create it again:
#
#   aws ecs create-express-gateway-service --cluster frank-bee-oawvo1 \
#     --execution-role-arn arn:aws:iam::...:role/ecsTaskExecutionRole \
#     --infrastructure-role-arn arn:aws:iam::...:role/service-role/ecsInfrastructureRoleForExpressServices \
#     --primary-container 'image=...,containerPort=3000,environment=[{name=ASK_AI_API_URL,value=http://api.ask-ai.internal:8000}]' \
#     --health-check-path /login

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPO="${ECR_REPO:-ask-ai-ui}"
ECS_CLUSTER="${ECS_CLUSTER:-frank-bee-oawvo1}"
ECS_SERVICE="${ECS_SERVICE:-ask-ai-ui-1056}"

export AWS_REGION
export AWS_PAGER=""

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

for cmd in aws docker git jq; do
    command -v "$cmd" >/dev/null || die "$cmd is not installed"
done

cd "$(git rev-parse --show-toplevel)"

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
    echo "warning: uncommitted changes are not deployed, only HEAD is" >&2
fi

TAG="$(git rev-parse --short=12 HEAD)"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
IMAGE="$REGISTRY/$ECR_REPO:$TAG"
SERVICE_ARN="arn:aws:ecs:$AWS_REGION:$ACCOUNT_ID:service/$ECS_CLUSTER/$ECS_SERVICE"

# Fail before building anything if the service isn't there to deploy to. Its
# latest configuration is the one the next revision starts from.
service="$(aws ecs describe-express-gateway-service --service-arn "$SERVICE_ARN" \
    --output json 2>/dev/null)" ||
    die "service $ECS_SERVICE not found in cluster $ECS_CLUSTER (see the setup note at the top of this script)"
[[ "$(jq -r .service.status.statusCode <<<"$service")" == "ACTIVE" ]] ||
    die "service $ECS_SERVICE is not active"
container="$(jq '.service.activeConfigurations | max_by(.createdAt) | .primaryContainer' \
    <<<"$service")"

if [[ "$(jq -r .image <<<"$container")" == "$IMAGE" ]]; then
    log "$ECS_SERVICE is already running $TAG, nothing to deploy"
    exit 0
fi

log "Deploying $IMAGE"

# 1. Build and push.
if aws ecr describe-images --repository-name "$ECR_REPO" \
    --image-ids "imageTag=$TAG" >/dev/null 2>&1; then
    log "Image $TAG is already in ECR, skipping the build"
else
    log "Building the image"
    aws ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRY"
    # Build from a copy of HEAD so the image holds exactly the committed files.
    # (Piping `git archive` into `docker build -` would skip .dockerignore.)
    build_dir="$(mktemp -d)"
    trap 'rm -rf "$build_dir"' EXIT
    git archive --format=tar HEAD | tar -x -C "$build_dir"
    docker build --platform linux/amd64 --tag "$IMAGE" "$build_dir"
    docker push "$IMAGE"
fi

# 2. Update the service. The container settings, such as environment variables,
# carry over unchanged; only the image is new. ECS starts new tasks before
# stopping old ones.
log "Updating the service"
revision="$(aws ecs update-express-gateway-service --service-arn "$SERVICE_ARN" \
    --primary-container "$(jq --arg image "$IMAGE" '.image = $image' <<<"$container")" \
    --query service.targetConfiguration.serviceRevisionArn --output text)"
echo "$revision"

# 3. Wait for the deployment of this revision. It succeeds once the new tasks
# pass the load balancer's health check, and the circuit breaker rolls it back
# if they keep failing.
log "Waiting for the deploy (this takes several minutes)"
for _ in $(seq 1 80); do
    deploy_status="$(aws ecs list-service-deployments --cluster "$ECS_CLUSTER" \
        --service "$ECS_SERVICE" \
        --query "serviceDeployments[?targetServiceRevisionArn=='$revision'] | [0].status" \
        --output text)"
    case "$deploy_status" in
        SUCCESSFUL) break ;;
        # None until ECS has recorded the deployment.
        None | PENDING | IN_PROGRESS) sleep 15 ;;
        *) die "the deploy failed (status: $deploy_status); see the service's events" ;;
    esac
done
[[ "$deploy_status" == "SUCCESSFUL" ]] || die "timed out waiting for the deploy"

log "Deployed $TAG"
