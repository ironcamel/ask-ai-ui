import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ASSISTANT_LABELS, splitMentions } from "@/lib/assistants";

export function MentionChip({ assistant }: { assistant: keyof typeof ASSISTANT_LABELS }) {
  return (
    <span
      className={`rounded px-1 font-medium ${
        assistant === "claude"
          ? "bg-claude/12 text-claude-ink"
          : "bg-gemini/12 text-gemini-ink"
      }`}
    >
      @{assistant}
    </span>
  );
}

/** A person's post or comment: plain text with @mentions highlighted. */
export function PlainBody({ body }: { body: string }) {
  return (
    <p className="whitespace-pre-wrap break-words">
      {splitMentions(body).map((part, i) =>
        part.mention ? (
          <MentionChip key={i} assistant={part.mention} />
        ) : (
          part.text
        ),
      )}
    </p>
  );
}

/** An assistant's reply, which is usually Markdown. */
export function MarkdownBody({ body }: { body: string }) {
  return (
    <div className="markdown break-words">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, title, children }) => (
            <a href={href} title={title} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {body}
      </Markdown>
    </div>
  );
}
