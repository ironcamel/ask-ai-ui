import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { ForgotPasswordForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your account's email and we'll send you a link to choose a new one."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
