"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import {
  login,
  requestPasswordReset,
  resetPassword,
  signup,
  type ActionResult,
} from "@/app/actions";

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

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="rounded-xl bg-accent/10 px-3.5 py-2.5 text-sm">
      {children}
    </p>
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      {searchParams.has("reset") && !state.error && (
        <Notice>Your password has been changed. Log in with the new one.</Notice>
      )}
      <ErrorMessage state={state} />
      <Field label="Username" name="username" autoComplete="username" required autoFocus />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <Link
        href="/forgot-password"
        className="-mt-2 self-end text-sm text-muted hover:text-foreground hover:underline"
      >
        Forgot your password?
      </Link>
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

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {});
  if (state.sentTo) {
    return (
      <div className="flex flex-col gap-4">
        <Notice>
          If an account uses <strong className="font-semibold">{state.sentTo}</strong>,
          we&apos;ve emailed it a link to reset the password. The link works once and
          expires soon. Another can&apos;t be sent for a few minutes, so check your
          spam folder before asking again.
        </Notice>
        <p className="text-center text-sm text-muted">
          Got a token instead of a link?{" "}
          <Link
            href="/reset-password"
            className="font-medium text-foreground hover:underline"
          >
            Enter it here
          </Link>
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <ErrorMessage state={state} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        autoFocus
      />
      <Submit pending={pending} label="Email me a reset link" />
      <p className="text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  // The email links here with ?token=...; without one, the token is pasted in.
  const token = useSearchParams().get("token");
  const [state, action, pending] = useActionState(resetPassword, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <ErrorMessage state={state} />
      {token ? (
        <input type="hidden" name="token" value={token} />
      ) : (
        <Field
          label="Reset token"
          name="token"
          autoComplete="off"
          required
          autoFocus
          hint="It's in the email we sent you."
        />
      )}
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        autoFocus={!!token}
        hint="At least 8 characters."
      />
      <Field
        label="Confirm new password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
      />
      <Submit pending={pending} label="Change password" />
      <p className="text-center text-sm text-muted">
        Need a new link?{" "}
        <Link href="/forgot-password" className="font-medium text-foreground hover:underline">
          Ask again
        </Link>
      </p>
    </form>
  );
}
