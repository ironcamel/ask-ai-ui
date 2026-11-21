import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PostSkeleton } from "@/components/skeletons";
import { ThreadList } from "@/components/thread-list";
import { getCurrentUser } from "@/lib/session";
import { getThread } from "@/lib/threads";

export const metadata: Metadata = { title: "Post" };

export default function PostPage({ params }: PageProps<"/posts/[id]">) {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/" className="text-sm font-medium text-muted hover:text-foreground">
        ← Back to feed
      </Link>
      <Suspense fallback={<PostSkeleton />}>
        <Thread params={params} />
      </Suspense>
    </div>
  );
}

async function Thread({ params }: Pick<PageProps<"/posts/[id]">, "params">) {
  const { id } = await params;
  const [post, user] = await Promise.all([getThread(id), getCurrentUser()]);
  return <ThreadList posts={[post]} currentUser={user} full />;
}
