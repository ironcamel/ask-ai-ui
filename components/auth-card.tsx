import type { ReactNode } from "react";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto mt-6 max-w-sm rounded-3xl border border-line bg-surface p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 mb-6 text-sm text-muted">{subtitle}</p>
      {children}
    </div>
  );
}
