import { isAssistant } from "@/lib/assistants";

const COLORS = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
];

function colorFor(username: string): string {
  let hash = 0;
  for (const char of username) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

const SIZES = {
  sm: "size-8 text-sm",
  md: "size-10 text-base",
  lg: "size-16 text-2xl",
};

export function Avatar({
  username,
  size = "md",
}: {
  username: string;
  size?: keyof typeof SIZES;
}) {
  const base = `${SIZES[size]} shrink-0 rounded-full grid place-items-center font-semibold text-white select-none`;
  if (isAssistant(username)) {
    return (
      <span
        aria-hidden
        className={`${base} ${username === "claude" ? "bg-claude" : "bg-linear-to-br from-gemini to-violet-500"}`}
      >
        {username === "claude" ? "✳" : "✦"}
      </span>
    );
  }
  return (
    <span aria-hidden className={`${base} ${colorFor(username)}`}>
      {username.charAt(0).toUpperCase()}
    </span>
  );
}
