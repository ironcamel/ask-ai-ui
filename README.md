# ask-ai-ui

A web UI for the [ask-ai](../ask-ai) API: a feed where people post and comment,
and where mentioning `@claude` or `@gemini` gets an AI reply in the thread.

![screenshot](docs/screenshot1.png)

## Running it

Start the ask-ai API first (it listens on `http://127.0.0.1:8000` by default),
then:

```bash
yarn install
yarn dev
```

and open http://localhost:3000.

To point at an API somewhere else, set `ASK_AI_API_URL` (see `.env.example`).

For password reset emails to link back here, set `PASSWORD_RESET_URL` on the
API to this app's `/reset-password` page, e.g.
`http://localhost:3000/reset-password`. Without it, the email contains just a
token, which `/reset-password` also accepts pasted in.

## Deploying

The app runs on AWS as an ECS Express Mode service, `ask-ai-ui-1056`.
`scripts/deploy.sh` deploys the current commit to it: it builds the image,
pushes it to ECR, and rolls the service onto it. Run it with AWS credentials in
the environment. The comment at the top of the script covers its settings and
the one-time AWS setup.

GitHub Actions (`.github/workflows/ci.yml`) lints and builds every push and pull
request, and runs the same script for pushes to `main` that pass. It signs in to
AWS with OIDC as the `github-actions-ask-ai-ui-deploy` role, which only `main`
of this repo can assume.

## How it works

- **The browser never calls the API.** The API has no CORS headers, so all
  requests go through the Next.js server: Server Components read data
  (`lib/api.ts`, `lib/threads.ts`) and Server Actions write it (`app/actions.ts`).
- **Auth** posts to `/auth/token` and keeps the access token, and the refresh
  token the API sets as a cookie, in httpOnly cookies of this app's own
  (`lib/session.ts`). Server Components can't write cookies, so `proxy.ts`
  trades the refresh token for new tokens before any request that arrives
  within a minute of the access token expiring, or after it has. Requests
  that arrive together with the same refresh token share one refresh, since
  the API ends the login when a refresh token is used twice. Logging out
  revokes the refresh token with `/auth/logout`. You're shown as logged out
  once the refresh token expires or is revoked.
- **AI replies** are created by the API in the background after a post or
  comment is saved. The UI works out which questions are still unanswered
  (`pendingReplies` in `lib/assistants.ts`), shows "Claude is thinking…", and
  refreshes the page every few seconds until the reply arrives or two minutes
  pass (`components/pending-reply.tsx`). Assistant replies render as Markdown.
- The composer mirrors the API's mention rules, so it can tell you before you
  post whether an assistant will answer.

## Limitations

The API returns posts oldest first with no total count, so the feed loads every
post, comment, and user and sorts them on the server. That's fine for a small
community; a larger one needs a newest-first, paginated endpoint.
