"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

import { LanguageSwitch } from "@/components/public/language-switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { Locale } from "@/lib/types";

type LoginFormProps = {
  locale: Locale;
  showDemoAccounts: boolean;
};

const demoAccounts = [
  { email: "admin@madasoatransit.local", password: "Admin123!" },
  { email: "operator@madasoatransit.local", password: "Operator123!" },
  { email: "finance@madasoatransit.local", password: "Finance123!" },
] as const;

export function LoginForm({ locale, showDemoAccounts }: LoginFormProps) {
  const t = useTranslations("admin");
  const tRoles = useTranslations("roles");
  const [email, setEmail] = useState<string>(showDemoAccounts ? demoAccounts[0].email : "");
  const [password, setPassword] = useState<string>(showDemoAccounts ? demoAccounts[0].password : "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function fillAccount(index: number) {
    setEmail(demoAccounts[index].email);
    setPassword(demoAccounts[index].password);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: `/${locale}/admin`,
      });

      if (!response || response.error) {
        setError("Invalid credentials.");
        return;
      }

      const targetUrl = response.url ?? `/${locale}/admin`;
      window.location.assign(targetUrl);
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-6">
      <div className="glass-card accent-ring w-full max-w-2xl rounded-[2rem] p-6 sm:p-10">
        <div className="flex justify-end gap-3">
          <ThemeToggle locale={locale} />
          <LanguageSwitch locale={locale} path="/admin/login" />
        </div>
        <div className="mt-4 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--brand)]">
            MadaSoa Transit
          </p>
          <h1 className="mt-3 text-4xl font-black">{t("login")}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
            {t("loginDescription")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-[var(--muted)]">{t("email")}</label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-[var(--muted)]">{t("password")}</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error ? (
            <div className="danger-panel rounded-2xl px-4 py-3 text-sm text-[var(--foreground)]">
              {error}
            </div>
          ) : null}
          <Button type="submit" size="lg" className="w-full rounded-[1rem]" disabled={isPending}>
            {isPending ? "..." : t("submit")}
          </Button>
        </form>

        {showDemoAccounts ? (
          <div className="mt-8 rounded-[1.6rem] border border-[var(--line)] bg-[var(--surface-secondary)] p-5">
            <h2 className="text-sm font-black uppercase tracking-[0.28em] text-[var(--muted)]">
              {t("demoCredentials")}
            </h2>
            <div className="mt-4 space-y-3">
              {demoAccounts.map((account, index) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillAccount(index)}
                  className="flex w-full items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--field)] px-4 py-3 text-left transition hover:bg-[var(--field-focus)]"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{account.email}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {tRoles(index === 0 ? "admin" : index === 1 ? "operator" : "finance")}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.22em] text-[var(--brand)]">
                    Use
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
