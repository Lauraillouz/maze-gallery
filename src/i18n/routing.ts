import { defineRouting } from "next-intl/routing";

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: "fr" satisfies Locale,
});
