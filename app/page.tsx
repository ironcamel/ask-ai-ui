import Link from "next/link";
import { Suspense } from "react";
import { createPost } from "@/app/actions";
import { Avatar } from "@/components/avatar";
import { MentionChip } from "@/components/body";
import { Composer } from "@/components/composer";
import { FeedSkeleton } from "@/components/skeletons";
import { ThreadList } from "@/components/thread-list";
import { getCurrentUser } from "@/lib/session";
import { getFeed } from "@/lib/threads";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<div className="h-36 rounded-3xl border border-line bg-surface" />}>
        <NewPost />
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <Feed />
      </Suspense>
    </div>
  );
}

async function NewPost() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <h1 className="text-xl font-semibold tracking-tight">
          Ask the room, or ask an AI.
        </h1>
        <p className="mt-1.5 text-muted">
          Mention <MentionChip assistant="claude" /> or <MentionChip assistant="gemini" />{" "}
          in a post or comment and they’ll reply right in the thread.
        </p>
        <div className="mt-4 flex gap-2 text-sm font-semibold">
          <Link
            href="/signup"
            className="rounded-full bg-accent px-4 py-2 text-accent-fg hover:opacity-90"
          >
            Create an account
          </Link>
          <Link href="/login" className="rounded-full px-4 py-2 hover:bg-hover">
            Log in
          </Link>
        </div>
      </section>
    );
  }
  return (
    <section
      aria-label="New post"
      className="flex gap-3 rounded-3xl border border-line bg-surface p-4 sm:p-5"
    >
      <Avatar username={user.username} />
      <div className="min-w-0 flex-1">
        <Composer
          action={createPost}
          placeholder="What’s on your mind? Mention @claude or @gemini to ask an AI."
          submitLabel="Post"
          minRows={2}
        />
      </div>
    </section>
  );
}

async function Feed() {
  const [posts, user] = await Promise.all([getFeed(), getCurrentUser()]);
  if (posts.length === 0) {
    return (
      <p className="py-16 text-center text-muted">
        No posts yet. Be the first to say something.
      </p>
    );
  }
  return <ThreadList posts={posts} currentUser={user} />;
}
