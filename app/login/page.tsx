import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthCard title="Welcome back" subtitle="Log in to post, comment, and ask the AIs.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
