"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass-card w-full max-w-xl rounded-[2rem] p-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--brand)]">MadaSoa Transit</p>
        <h1 className="mt-3 text-3xl font-black">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          The page hit an unexpected problem. You can try again without leaving your current flow.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-secondary)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
