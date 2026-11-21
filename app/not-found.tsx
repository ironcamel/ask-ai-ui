import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Nothing here</h1>
      <p className="mt-2 text-muted">That post or person doesn’t exist, or was deleted.</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:opacity-90"
      >
        Back to the feed
      </Link>
    </div>
  );
}
