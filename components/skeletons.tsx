function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-hover ${className}`} />;
}

export function PostSkeleton() {
  return (
    <div className="rounded-3xl border border-line bg-surface p-5">
      <div className="flex gap-3">
        <div className="size-10 animate-pulse rounded-full bg-hover" />
        <div className="flex flex-1 flex-col gap-2.5 pt-1">
          <Bar className="h-3 w-32" />
          <Bar className="h-3 w-full" />
          <Bar className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Loading posts">
      <PostSkeleton />
      <PostSkeleton />
      <PostSkeleton />
    </div>
  );
}
