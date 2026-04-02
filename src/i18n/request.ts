import { getRequestConfig } from "next-intl/server";

import { getMessages, isValidLocale } from "@/lib/i18n";
import { defaultLocale } from "@/lib/types";

export default getRequestConfig(async ({ requestLocale }) => {
  const localeCandidate = await requestLocale;
  const locale = localeCandidate && isValidLocale(localeCandidate) ? localeCandidate : defaultLocale;

  return {
    locale,
    messages: getMessages(locale),
  };
});
