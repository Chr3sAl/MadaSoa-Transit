import type { AbstractIntlMessages } from "next-intl";

import en from "@/messages/en";
import fr from "@/messages/fr";
import type { Locale } from "@/lib/types";
import { locales } from "@/lib/types";

const messages = {
  fr,
  en,
} satisfies Record<Locale, AbstractIntlMessages>;

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export function getMessages(locale: Locale) {
  return messages[locale];
}
