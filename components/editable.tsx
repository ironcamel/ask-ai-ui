"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/app/actions";
import { Composer } from "./composer";

/**
 * A post or comment body that its author can edit in place or delete.
 * The rendered body comes from the server as `children`.
 */
export function Editable({
  kind,
  body,
  canEdit,
  update,
  remove,
  header,
  children,
}: {
  kind: "post" | "comment";
  body: string;
  canEdit: boolean;
  update: (formData: FormData) => Promise<ActionResult>;
  remove: () => Promise<ActionResult>;
  header: ReactNode;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string>();

  function onDelete() {
    if (!confirm(`Delete this ${kind}? This can't be undone.`)) {
      return;
    }
    startDelete(async () => {
      const result = await remove();
      setError(result?.error);
    });
  }

  return (
    <div className={deleting ? "opacity-50 transition-opacity" : undefined}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">{header}</div>
        {canEdit && !editing && (
          <div className="-mr-1.5 -mt-1 flex shrink-0">
            <IconButton label={`Edit ${kind}`} onClick={() => setEditing(true)}>
              <path d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z" />
            </IconButton>
            <IconButton label={`Delete ${kind}`} onClick={onDelete} disabled={deleting}>
              <path d="M4 6h12M8 6V4h4v2m-6 0l.7 10h6.6L14 6" />
            </IconButton>
          </div>
        )}
      </div>
      <div className="mt-1.5">
        {editing ? (
          <Composer
            action={update}
            initialBody={body}
            placeholder={`Edit your ${kind}`}
            submitLabel="Save"
            autoFocus
            onCancel={() => setEditing(false)}
            onSaved={() => setEditing(false)}
            assistantHints={false}
          />
        ) : (
          children
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-full text-muted hover:bg-hover hover:text-foreground"
    >
      <svg
        viewBox="0 0 20 20"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}
