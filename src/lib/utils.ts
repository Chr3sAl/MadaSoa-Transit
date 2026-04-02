import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toIsoString(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

export function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeLookupValue(value: string) {
  return value.trim().toUpperCase();
}

export function formatDate(value?: string | null, locale = "fr-FR") {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatDateTime(value?: string | null, locale = "fr-FR") {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
