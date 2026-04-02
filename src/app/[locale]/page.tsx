import { notFound } from "next/navigation";

import { TrackingPortal } from "@/components/public/tracking-portal";
import { isValidLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  return <TrackingPortal locale={locale} />;
}
