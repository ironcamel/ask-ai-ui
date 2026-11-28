"use client";

import { useActionState, useLayoutEffect, useRef, useState } from "react";
import type { ActionResult } from "@/app/actions";
import {
  ASSISTANT_LABELS,
  ASSISTANTS,
  findMention,
  replaceMentions,
  splitMentions,
  type Assistant,
} from "@/lib/assistants";
import { MAX_BODY_LENGTH } from "@/lib/types";

// Start counting down this close to the limit.
const LENGTH_WARNING = 500;

function lengthHint(body: string): { text: string; over: boolean } | null {
  // The API counts characters of the trimmed body, not UTF-16 code units.
  const left = MAX_BODY_LENGTH - [...body.trim()].length;
  if (left > LENGTH_WARNING) {
    return null;
  }
  const n = Math.abs(left).toLocaleString("en-US");
  return left < 0
    ? { text: `${n} characters over the limit.`, over: true }
    : { text: `${n} characters left.`, over: false };
}

function mentionHint(
  body: string,
  mentioned: Set<Assistant>,
): { text: string; tone: "info" | "warn" } | null {
  if (mentioned.size === 0) {
    return null;
  }
  const assistant = findMention(body);
  if (!assistant) {
    const [first] = mentioned;
    return { text: `Add a question for ${ASSISTANT_LABELS[first]}.`, tone: "warn" };
  }
  const label = ASSISTANT_LABELS[assistant];
  if (mentioned.size > 1) {
    return {
      text: `Only ${label} will reply: just the first assistant mentioned answers.`,
      tone: "warn",
    };
  }
  return { text: `${label} will reply in the comments.`, tone: "info" };
}

export function Composer({
  action,
  name = "body",
  initialBody = "",
  placeholder,
  submitLabel,
  autoFocus,
  minRows = 2,
  onCancel,
  onSaved,
  assistantHints = true,
  compact = false,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  name?: string;
  initialBody?: string;
  placeholder: string;
  submitLabel: string;
  autoFocus?: boolean;
  minRows?: number;
  onCancel?: () => void;
  onSaved?: () => void;
  assistantHints?: boolean;
  // Hide the buttons until the box is in use.
  compact?: boolean;
}) {
  const [body, setBody] = useState(initialBody);
  const [focused, setFocused] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  // The text the last error was about, so editing it clears the error.
  const [failedBody, setFailedBody] = useState<string>();
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult, formData: FormData) => {
      const result = await action(formData);
      if (result.error) {
        setFailedBody(String(formData.get(name) ?? ""));
      } else {
        setBody(initialBody);
        onSaved?.();
      }
      return result;
    },
    {},
  );
  const error = body === failedBody ? state.error : undefined;

  // Grow with the text instead of scrolling.
  useLayoutEffect(() => {
    const el = textarea.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [body]);

  function insertMention(assistant: Assistant) {
    const el = textarea.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    if (mentioned.size > 0) {
      // Point the existing mentions at this assistant instead.
      setBody(replaceMentions(body, assistant));
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(start, end);
      });
      return;
    }
    const mention = `@${assistant} `;
    const before = body.slice(0, start);
    const spacer = before && !/\s$/.test(before) ? " " : "";
    const next = before + spacer + mention + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      const cursor = (before + spacer + mention).length;
      el?.focus();
      el?.setSelectionRange(cursor, cursor);
    });
  }

  const mentioned = new Set(
    splitMentions(body).flatMap((p) => (p.mention ? [p.mention] : [])),
  );
  const hint = assistantHints ? mentionHint(body, mentioned) : null;
  const length = lengthHint(body);
  const empty = body.trim() === "";
  const showControls = !compact || focused || !empty || Boolean(error);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <textarea
        ref={textarea}
        name={name}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
          if (e.key === "Escape" && onCancel) {
            onCancel();
          }
        }}
        placeholder={placeholder}
        rows={minRows}
        autoFocus={autoFocus}
        aria-label={placeholder}
        className="w-full resize-none overflow-hidden rounded-xl border border-line bg-surface px-3.5 py-2.5 leading-relaxed outline-none placeholder:text-muted focus:border-accent focus:ring-3 focus:ring-accent/15"
      />
      <div className={showControls ? "flex flex-wrap items-center gap-2" : "hidden"}>
        {assistantHints &&
          ASSISTANTS.map((assistant) => (
            <button
              key={assistant}
              type="button"
              // Keep focus in the textarea so a compact composer stays open.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertMention(assistant)}
              disabled={mentioned.has(assistant)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
                assistant === "claude"
                  ? "border-claude/30 text-claude-ink enabled:hover:bg-claude/10"
                  : "border-gemini/30 text-gemini-ink enabled:hover:bg-gemini/10"
              }`}
            >
              Ask @{assistant}
            </button>
          ))}
        <p
          aria-live="polite"
          className={`min-w-0 flex-1 text-xs ${
            error || length?.over
              ? "text-danger"
              : length || hint?.tone === "warn"
                ? "text-amber-700 dark:text-amber-400"
                : "text-muted"
          }`}
        >
          {error ?? length?.text ?? hint?.text}
        </p>
        <div className="ml-auto flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:bg-hover"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={pending || empty || length?.over}
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {pending ? "Sending…" : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
