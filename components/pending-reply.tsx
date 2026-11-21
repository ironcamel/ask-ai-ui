"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ASSISTANT_LABELS, REPLY_TIMEOUT_MS, type Assistant } from "@/lib/assistants";
import { Avatar } from "./avatar";
import { useNow } from "./clock";

const POLL_INTERVAL_MS = 3_000;

function isWaiting(now: number | null, since: string): boolean {
  return now !== null && now - Date.parse(since) < REPLY_TIMEOUT_MS;
}

/**
 * Re-fetches the page while an assistant's reply is on its way. The API adds
 * replies in the background after responding, so polling is how they show up.
 */
export function AutoRefresh({ pending }: { pending: string[] }) {
  const router = useRouter();
  const now = useNow();
  const active = pending.some((since) => isWaiting(now, since));

  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [active, router]);

  return null;
}

export function ThinkingIndicator({
  assistant,
  since,
}: {
  assistant: Assistant;
  since: string;
}) {
  const now = useNow();
  if (now === null) {
    return null;
  }
  const label = ASSISTANT_LABELS[assistant];
  if (!isWaiting(now, since)) {
    return (
      <p className="py-1 text-xs text-muted">
        {label} hasn’t replied. It may have run into a problem.
      </p>
    );
  }
  return (
    <div className="flex items-center gap-3 py-1" role="status">
      <Avatar username={assistant} size="sm" />
      <span className="text-sm text-muted">
        {label} is thinking
        <span className="thinking-dots" aria-hidden>
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </span>
    </div>
  );
}
