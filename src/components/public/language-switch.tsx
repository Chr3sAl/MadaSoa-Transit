"use client";

import Link from "next/link";
import { Languages } from "lucide-react";

import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

type LanguageSwitchProps = {
  locale: Locale;
  path?: string;
};

export function LanguageSwitch({ locale, path = "" }: LanguageSwitchProps) {
  const otherLocale: Locale = locale === "fr" ? "en" : "fr";
  const href = `/${otherLocale}${path}`;

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-secondary)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]",
      )}
    >
      <Languages className="h-4 w-4" />
      {otherLocale.toUpperCase()}
    </Link>
  );
}
