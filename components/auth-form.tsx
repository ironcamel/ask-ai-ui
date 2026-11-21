"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { login, signup, type ActionResult } from "@/app/actions";

function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <input
        {...props}
        className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base font-normal outline-none focus:border-accent focus:ring-3 focus:ring-accent/15"
      />
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

function Submit({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded-full bg-accent px-4 py-2.5 font-semibold text-accent-fg hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "One moment…" : label}
    </button>
  );
}

function ErrorMessage({ state }: { state: ActionResult }) {
  return state.error ? (
    <p role="alert" className="rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
      {state.error}
    </p>
  ) : null;
}

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <ErrorMessage state={state} />
      <Field label="Username" name="username" autoComplete="username" required autoFocus />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <Submit pending={pending} label="Log in" />
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-foreground hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <ErrorMessage state={state} />
      <Field
        label="Username"
        name="username"
        autoComplete="username"
        required
        maxLength={50}
        autoFocus
      />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        hint="At least 8 characters."
      />
      <Submit pending={pending} label="Create account" />
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
