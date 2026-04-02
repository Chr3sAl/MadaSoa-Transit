"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BarChart3,
  Boxes,
  ChevronRight,
  LayoutDashboard,
  MoreHorizontal,
  ScanLine,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { LogoutButton } from "@/components/admin/logout-button";
import { LanguageSwitch } from "@/components/public/language-switch";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import type { AdminSection } from "@/lib/permissions";
import type { Locale } from "@/lib/types";

type MobileNavItem = {
  key: AdminSection;
  href: string;
  label: string;
  mobileLabel: string;
};

type AdminMobileNavProps = {
  locale: Locale;
  active: AdminSection;
  currentPath: string;
  roleLabel: string;
  userName: string;
  userEmail: string;
  demoWarning: string;
  items: MobileNavItem[];
};

const iconMap: Record<AdminSection, LucideIcon> = {
  dashboard: LayoutDashboard,
  intake: ScanLine,
  shipments: Boxes,
  customers: Users,
  imports: Boxes,
  reports: BarChart3,
  users: ShieldCheck,
};

function splitMobileNavItems(items: MobileNavItem[]) {
  if (items.length <= 4) {
    return {
      primaryItems: items,
      secondaryItems: [] as MobileNavItem[],
    };
  }

  return {
    primaryItems: items.slice(0, 3),
    secondaryItems: items.slice(3),
  };
}

export function AdminMobileNav({
  locale,
  active,
  currentPath,
  roleLabel,
  userName,
  userEmail,
  demoWarning,
  items,
}: AdminMobileNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { primaryItems, secondaryItems } = useMemo(() => splitMobileNavItems(items), [items]);

  return (
    <>
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <nav
          aria-label="Admin mobile navigation"
          className="glass-card rounded-[1.8rem] border border-[var(--line)] px-2 py-2 shadow-[0_20px_50px_var(--shadow)] backdrop-blur-xl"
          style={{
            gridTemplateColumns: `repeat(${secondaryItems.length > 0 ? 4 : primaryItems.length}, minmax(0, 1fr))`,
          }}
        >
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${secondaryItems.length > 0 ? 4 : primaryItems.length}, minmax(0, 1fr))`,
            }}
          >
            {primaryItems.map((item) => {
              const Icon = iconMap[item.key];
              const isActive = item.key === active;

              return (
                <Link
                  key={item.key}
                  href={`/${locale}${item.href}`}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-w-0 flex-col items-center gap-1 rounded-[1.3rem] px-2 py-2 text-center text-[11px] font-semibold transition",
                    isActive
                      ? "bg-[var(--accent)] text-[var(--button-foreground)] shadow-[0_12px_28px_var(--accent-shadow)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="max-w-full truncate">{item.mobileLabel}</span>
                </Link>
              );
            })}

            {secondaryItems.length > 0 ? (
              <Dialog.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <Dialog.Trigger asChild>
                  <button
                    type="button"
                    className="flex min-w-0 flex-col items-center gap-1 rounded-[1.3rem] px-2 py-2 text-center text-[11px] font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                  >
                    <MoreHorizontal className="h-4 w-4 shrink-0" />
                    <span className="max-w-full truncate">{locale === "fr" ? "Plus" : "More"}</span>
                  </button>
                </Dialog.Trigger>

                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-sm" />
                  <Dialog.Content className="fixed inset-x-0 bottom-0 z-[60] max-h-[88vh] overflow-y-auto rounded-t-[2rem] border-t border-[var(--line)] bg-[#082b2f] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-5 text-[var(--foreground)] shadow-[0_-20px_60px_var(--shadow)] outline-none">
                    <div className="mx-auto w-12 rounded-full border-2 border-white/10" />
                    <div className="mt-5 flex items-start justify-between gap-4">
                      <div>
                        <Dialog.Title className="text-xs uppercase tracking-[0.28em] text-[var(--brand)]">
                          MadaSoa Transit
                        </Dialog.Title>
                        <p className="mt-3 text-2xl font-black">
                          {locale === "fr" ? "Navigation mobile" : "Mobile navigation"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white/75">{demoWarning}</p>
                      </div>
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/75 transition hover:bg-white/10 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">{locale === "fr" ? "Fermer" : "Close"}</span>
                        </button>
                      </Dialog.Close>
                    </div>

                    <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{userName}</p>
                          <p className="truncate text-sm text-white/65">{userEmail}</p>
                        </div>
                        <Badge tone="accent">{roleLabel}</Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <ThemeToggle locale={locale} className="w-full justify-center px-3" />
                      <LanguageSwitch locale={locale} path={currentPath} />
                      <LogoutButton locale={locale} />
                    </div>

                    <div className="mt-6 space-y-2">
                      {items.map((item) => {
                        const Icon = iconMap[item.key];
                        const isActive = item.key === active;

                        return (
                          <Dialog.Close asChild key={item.key}>
                            <Link
                              href={`/${locale}${item.href}`}
                              className={cn(
                                "flex items-center justify-between rounded-[1.4rem] border px-4 py-4 text-sm font-semibold transition",
                                isActive
                                  ? "border-transparent bg-[var(--accent)] text-[var(--button-foreground)] shadow-[0_14px_30px_var(--accent-shadow)]"
                                  : "border-white/10 bg-white/5 text-white/85 hover:bg-white/10",
                              )}
                            >
                              <span className="flex items-center gap-3">
                                <Icon className="h-4 w-4" />
                                {item.label}
                              </span>
                              <ChevronRight className="h-4 w-4 opacity-70" />
                            </Link>
                          </Dialog.Close>
                        );
                      })}
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            ) : null}
          </div>
        </nav>
      </div>
    </>
  );
}
