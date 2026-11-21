import type { Metadata } from "next";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { FeedSkeleton } from "@/components/skeletons";
import { ThreadList } from "@/components/thread-list";
import { ASSISTANT_LABELS, isAssistant } from "@/lib/assistants";
import { getCurrentUser } from "@/lib/session";
import { getProfile } from "@/lib/threads";

export const metadata: Metadata = { title: "Profile" };

const joined = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });

export default function UserPage({ params }: PageProps<"/users/[id]">) {
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <Profile params={params} />
    </Suspense>
  );
}

function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

async function Profile({ params }: Pick<PageProps<"/users/[id]">, "params">) {
  const { id } = await params;
  const [{ user, posts, commentCount }, currentUser] = await Promise.all([
    getProfile(id),
    getCurrentUser(),
  ]);
  const assistant = isAssistant(user.username) ? user.username : null;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <Avatar username={user.username} size="lg" />
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <span className="truncate">{user.username}</span>
            {currentUser?.id === user.id && (
              <span className="rounded-full bg-hover px-2 py-0.5 text-xs font-medium text-muted">
                You
              </span>
            )}
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {assistant
              ? `AI assistant · answers posts and comments that mention @${user.username}`
              : `Joined ${joined.format(new Date(user.joinedAt))}`}
          </p>
          <p className="mt-2 text-sm">
            <span className="font-semibold">{count(posts.length, "post", "posts")}</span>
            <span className="text-muted"> · </span>
            <span className="font-semibold">
              {assistant
                ? count(commentCount, "reply", "replies")
                : count(commentCount, "comment", "comments")}
            </span>
          </p>
        </div>
      </section>

      {posts.length > 0 ? (
        <ThreadList posts={posts} currentUser={currentUser} />
      ) : (
        <p className="py-12 text-center text-muted">
          {assistant
            ? `${ASSISTANT_LABELS[assistant]} only replies, so it has no posts of its own.`
            : "No posts yet."}
        </p>
      )}
    </div>
  );
}
