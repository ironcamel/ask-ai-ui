// The AI assistants the API answers for. Each name is both its @mention and
// the username of the bot account that posts its replies.
export const ASSISTANTS = ["claude", "gemini"] as const;

export type Assistant = (typeof ASSISTANTS)[number];

export const ASSISTANT_LABELS: Record<Assistant, string> = {
  claude: "Claude",
  gemini: "Gemini",
};

// How long to wait for a reply before assuming it isn't coming. The API logs
// failed LLM calls instead of reporting them, so silence is all we get.
export const REPLY_TIMEOUT_MS = 2 * 60 * 1000;

export function isAssistant(username: string): username is Assistant {
  return (ASSISTANTS as readonly string[]).includes(username);
}

const NAMES = ASSISTANTS.join("|");
// "@claude" must stand alone: "@claudette" and "bob@claude.com" don't count.
const MENTION = new RegExp(`(?<![\\p{L}\\p{N}_])@(${NAMES})(?![\\p{L}\\p{N}_])`, "u");
const MENTION_SPLIT = new RegExp(`((?<![\\p{L}\\p{N}_])@(?:${NAMES})(?![\\p{L}\\p{N}_]))`, "u");

/**
 * The assistant that will answer this body, matching the API's rules: the
 * first one mentioned, as long as there's a question besides the mentions.
 */
export function findMention(body: string): Assistant | null {
  const match = MENTION.exec(body);
  if (!match) {
    return null;
  }
  const rest = body.replace(new RegExp(NAMES, "g"), "");
  if (!/[\p{L}\p{N}_]/u.test(rest)) {
    return null;
  }
  return match[1] as Assistant;
}

/** Split a body into text and @mention parts, for highlighting. */
export function splitMentions(
  body: string,
): { text: string; mention?: Assistant }[] {
  return body
    .split(MENTION_SPLIT)
    .filter(Boolean)
    .map((text) =>
      text.startsWith("@") && isAssistant(text.slice(1))
        ? { text, mention: text.slice(1) as Assistant }
        : { text },
    );
}

export type PendingReply = { assistant: Assistant; since: string };

/**
 * Questions on a post that an assistant hasn't answered yet.
 *
 * Walks the post and its comments in order, queueing each mention and
 * matching it with the next reply from that assistant.
 */
export function pendingReplies(
  items: { body: string; created_at: string; username: string }[],
): PendingReply[] {
  const queues: Record<Assistant, string[]> = { claude: [], gemini: [] };
  for (const item of items) {
    if (isAssistant(item.username)) {
      // Replies never trigger replies, so a bot's own mentions don't count.
      queues[item.username].shift();
      continue;
    }
    const assistant = findMention(item.body);
    if (assistant) {
      queues[assistant].push(item.created_at);
    }
  }
  return ASSISTANTS.flatMap((assistant) =>
    queues[assistant].map((since) => ({ assistant, since })),
  );
}
