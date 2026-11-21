import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "@/components/user-menu";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "ask-ai", template: "%s · ask-ai" },
  description: "Post, comment, and ask @claude or @gemini anything.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-10 border-b border-line bg-background/85 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-4 px-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              ask<span className="text-claude">·</span>ai
            </Link>
            <Suspense fallback={<div className="h-8 w-24" />}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
