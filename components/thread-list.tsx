import type { PostView } from "@/lib/threads";
import type { Author } from "@/lib/types";
import { AutoRefresh } from "./pending-reply";
import { PostCard } from "./post-card";

/** Posts, kept up to date while any of them waits on an assistant. */
export function ThreadList({
  posts,
  currentUser,
  full = false,
}: {
  posts: PostView[];
  currentUser: Author | null;
  full?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <AutoRefresh pending={posts.flatMap((p) => p.pending.map((r) => r.since))} />
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUser={currentUser} full={full} />
      ))}
    </div>
  );
}
