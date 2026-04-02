import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";

import { getMessages, isValidLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { locales } from "@/lib/types";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  return (
    <NextIntlClientProvider locale={locale} messages={getMessages(locale as Locale)}>
      {children}
    </NextIntlClientProvider>
  );
}
