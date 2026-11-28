import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { ResetPasswordForm } from "@/components/auth-form";

// The URL carries the reset token, so don't leak it to other sites.
export const metadata: Metadata = { title: "Reset password", referrer: "no-referrer" };

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Choose a new password" subtitle="Then log in with it.">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
