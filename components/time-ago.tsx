"use client";

import { useNow } from "./clock";

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const absolute = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

function ago(seconds: number): string {
  if (seconds < 45) {
    return "just now";
  }
  for (const [unit, size] of UNITS) {
    if (seconds >= size) {
      return relative.format(-Math.floor(seconds / size), unit);
    }
  }
  return relative.format(-1, "minute");
}

export function TimeAgo({ iso }: { iso: string }) {
  const now = useNow();
  const date = new Date(iso);
  return (
    <time
      dateTime={iso}
      title={now === null ? undefined : absolute.format(date)}
      className="whitespace-nowrap"
    >
      {now === null ? " " : ago(Math.max(0, (now - date.getTime()) / 1000))}
    </time>
  );
}
