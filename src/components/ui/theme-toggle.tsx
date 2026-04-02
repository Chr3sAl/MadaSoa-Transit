"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

type ThemeToggleProps = {
  locale: "fr" | "en";
  className?: string;
};

const storageKey = "madasoa-theme";

function getCurrentTheme(): Theme {
  if (typeof document === "undefined") {
    return "dark";
  }

  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleThemeChange = () => onStoreChange();
  window.addEventListener("madasoa-themechange", handleThemeChange);
  return () => window.removeEventListener("madasoa-themechange", handleThemeChange);
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(storageKey, theme);
  window.dispatchEvent(new Event("madasoa-themechange"));
}

export function ThemeToggle({ locale, className }: ThemeToggleProps) {
  const theme = useSyncExternalStore(subscribe, getCurrentTheme, () => "dark");

  const nextTheme = theme === "dark" ? "light" : "dark";
  const label =
    locale === "fr"
      ? nextTheme === "light"
        ? "Mode clair"
        : "Mode sombre"
      : nextTheme === "light"
        ? "Light mode"
        : "Dark mode";

  function handleToggle() {
    applyTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-secondary)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-hover)]",
        className,
      )}
    >
      {theme === "light" ? (
        <MoonStar className="h-4 w-4 text-[var(--brand)]" />
      ) : (
        <SunMedium className="h-4 w-4 text-[var(--brand)]" />
      )}
      <span className="hidden sm:inline" suppressHydrationWarning>
        {label}
      </span>
    </button>
  );
}
