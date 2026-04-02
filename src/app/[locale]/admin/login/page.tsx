import { notFound } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { isValidLocale } from "@/lib/i18n";
import { isDemoModeEnabled } from "@/lib/runtime";

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  return <LoginForm locale={locale} showDemoAccounts={isDemoModeEnabled()} />;
}
