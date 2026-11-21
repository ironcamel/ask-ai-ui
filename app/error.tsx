"use client";

import { useEffect } from "react";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-muted">
        We couldn’t load this page. The ask-ai server may be down.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
