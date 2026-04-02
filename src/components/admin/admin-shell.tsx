import Link from "next/link";
import { BarChart3, Boxes, FileSpreadsheet, LayoutDashboard, ScanLine, ShieldCheck, Users } from "lucide-react";
import type { Session } from "next-auth";

import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { LogoutButton } from "@/components/admin/logout-button";
import { LanguageSwitch } from "@/components/public/language-switch";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getMessages } from "@/lib/i18n";
import { canAccessAdminSection, type AdminSection } from "@/lib/permissions";
import type { Locale } from "@/lib/types";

type AdminShellProps = {
  locale: Locale;
  session: Session;
  active: AdminSection;
  title: string;
  description: string;
  children: React.ReactNode;
};

const navItems = [
  { key: "dashboard", icon: LayoutDashboard, href: "/admin" },
  { key: "intake", icon: ScanLine, href: "/admin/intake" },
  { key: "shipments", icon: Boxes, href: "/admin/shipments" },
  { key: "customers", icon: Users, href: "/admin/customers" },
  { key: "imports", icon: FileSpreadsheet, href: "/admin/imports" },
  { key: "reports", icon: BarChart3, href: "/admin/reports" },
  { key: "users", icon: ShieldCheck, href: "/admin/users" },
] as const satisfies ReadonlyArray<{ key: AdminSection; icon: typeof LayoutDashboard; href: string }>;

const mobileNavLabels = {
  en: {
    dashboard: "Home",
    intake: "Intake",
    shipments: "Shipments",
    customers: "Clients",
    imports: "Imports",
    reports: "Reports",
    users: "Team",
  },
  fr: {
    dashboard: "Accueil",
    intake: "Reception",
    shipments: "Expeditions",
    customers: "Clients",
    imports: "Imports",
    reports: "Rapports",
    users: "Equipe",
  },
} as const satisfies Record<Locale, Record<AdminSection, string>>;

export function AdminShell({
  locale,
  session,
  active,
  title,
  description,
  children,
}: AdminShellProps) {
  const messages = getMessages(locale);
  const currentPath = `/admin${active === "dashboard" ? "" : `/${active}`}`;
  const allowedNavItems = navItems
    .filter((item) => canAccessAdminSection(session.user.role, item.key))
    .map((item) => ({
      ...item,
      label: messages.admin[item.key],
      mobileLabel: mobileNavLabels[locale][item.key],
    }));

  return (
    <div className="page-backdrop min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:py-6">
        <aside className="glass-card hidden w-72 shrink-0 rounded-[2rem] p-5 lg:block">
          <div className="flex items-center gap-3">
            <div className="brand-mark flex h-12 w-12 items-center justify-center rounded-full font-black tracking-[0.2em]">
              MS
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--brand)]">
                {messages.common.appName}
              </p>
              <p className="text-sm text-[var(--muted)]">{messages.admin.title}</p>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {allowedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === active;
              return (
                <Link
                  key={item.key}
                  href={`/${locale}${item.href}`}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-[var(--accent)] text-[var(--button-foreground)] shadow-[0_14px_30px_var(--accent-shadow)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {messages.admin[item.key]}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6 pb-28 lg:pb-0">
          <header className="glass-card flex flex-col gap-5 rounded-[2rem] px-5 py-5 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="brand-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-black tracking-[0.2em] lg:hidden">
                  MS
                </div>
                <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                  {messages.admin.title}
                </p>
                <h1 className="mt-2 text-2xl font-black sm:text-3xl">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  {description}
                </p>
              </div>
              </div>
              <div className="hidden flex-wrap items-center gap-3 lg:flex">
                <Badge tone="accent">{messages.roles[session.user.role]}</Badge>
                <LanguageSwitch locale={locale} path={currentPath} />
                <ThemeToggle locale={locale} />
                <LogoutButton locale={locale} />
              </div>
              <div className="flex items-center gap-2 lg:hidden">
                <Badge tone="accent">{messages.roles[session.user.role]}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--foreground)]">{session.user.name}</p>
                <p className="truncate text-sm text-[var(--muted)]">{session.user.email}</p>
              </div>
              <p className="hidden text-sm text-[var(--muted)] sm:block">{messages.admin.demoWarning}</p>
            </div>
          </header>

          {children}
        </div>
      </div>
      <AdminMobileNav
        locale={locale}
        active={active}
        currentPath={currentPath}
        roleLabel={messages.roles[session.user.role]}
        userName={session.user.name ?? ""}
        userEmail={session.user.email ?? ""}
        demoWarning={messages.admin.demoWarning}
        items={allowedNavItems.map(({ key, href, label, mobileLabel }) => ({
          key,
          href,
          label,
          mobileLabel,
        }))}
      />
    </div>
  );
}
