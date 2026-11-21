import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { SignupForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Then mention @claude or @gemini to get an answer in the thread."
    >
      <SignupForm />
    </AuthCard>
  );
}
