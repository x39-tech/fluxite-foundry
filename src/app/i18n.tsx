import { ReactNode, useEffect } from "react";
import { i18n, type Messages } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { match } from "@formatjs/intl-localematcher";
import { useAppPersistentStore, updateAppPersistentState } from "./store";

/** Every language we support in the UI, each named in its own language. */
/* eslint-disable lingui/no-unlocalized-strings */
const UI_LOCALE_NAMES = {
  en: "English",
  "pseudo-LOCALE": "Pseudo-English (testing)",
} as const;
/* eslint-enable lingui/no-unlocalized-strings */

export type UiLocale = keyof typeof UI_LOCALE_NAMES;

export const DEFAULT_UI_LOCALE: UiLocale = "en";

/** Use the browser's requested language(s). */
export const SYSTEM_UI_LOCALE = "system";

/** The pseudo-english testing locale. */
const PSEUDO_UI_LOCALE: UiLocale = "pseudo-LOCALE";

/**
 * Loads the compiled catalog for each language we support.
 *
 * This is a map on purpose rather than import("../locales/{locale}.json?lingui"),
 * for better type safety and to ensure that the pseudo-locale is omitted
 * completely from production builds.
 */
const CATALOG_LOADERS: Partial<
  Record<UiLocale, () => Promise<{ messages: Messages }>>
> = {
  en: () => import("../locales/en.json?lingui"),
  ...(import.meta.env.DEV
    ? { "pseudo-LOCALE": () => import("../locales/pseudo-LOCALE.json?lingui") }
    : {}),
};

/** The languages this build can display. */
export const AVAILABLE_UI_LOCALES: readonly UiLocale[] = (
  Object.keys(UI_LOCALE_NAMES) as UiLocale[]
).filter((locale) => CATALOG_LOADERS[locale] !== undefined);

/** What to call a language in the UI. */
export function uiLocaleName(locale: UiLocale): string {
  return UI_LOCALE_NAMES[locale];
}

function isAvailableUiLocale(value: string): value is UiLocale {
  return (AVAILABLE_UI_LOCALES as readonly string[]).includes(value);
}

/**
 * Negotiates an interface language from BCP 47 tags given in descending order
 * of preference, usually called with `navigator.languages`.
 */
export function negotiateUiLocale(preferred: readonly string[]): UiLocale {
  const candidates = AVAILABLE_UI_LOCALES.filter(
    (locale) => locale !== PSEUDO_UI_LOCALE,
  );

  try {
    return match([...preferred], candidates, DEFAULT_UI_LOCALE) as UiLocale;
  } catch {
    return DEFAULT_UI_LOCALE;
  }
}

/**
 * Picks the interface language for a stored setting.
 *
 * If the setting doesn't correspond to a locale that we have available, or it
 * is set to "system", fall back to negotiating from the browser setting.
 */
export function resolveUiLocale(setting: string): UiLocale {
  if (setting !== SYSTEM_UI_LOCALE && isAvailableUiLocale(setting)) {
    return setting;
  }
  return negotiateUiLocale(navigator.languages);
}

/**
 * Loads a catalog and makes it the active one.
 *
 * Must be awaited before anything renders a translated string.
 */
export async function activateUiLocale(locale: UiLocale): Promise<void> {
  const load = CATALOG_LOADERS[locale];
  if (!load) {
    throw new Error(`This build carries no catalog for "${locale}".`);
  }

  const { messages } = await load();
  i18n.loadAndActivate({ locale, messages });

  document.documentElement.lang =
    locale === PSEUDO_UI_LOCALE ? DEFAULT_UI_LOCALE : locale;
}

/** The interface language to start in, before React renders anything. */
export function initialUiLocale(): UiLocale {
  return resolveUiLocale(useAppPersistentStore.getState().appSettings.uiLocale);
}

/** Which interface language the user should see. */
export function useUiLocale(): UiLocale {
  return useAppPersistentStore((state) =>
    resolveUiLocale(state.appSettings.uiLocale),
  );
}

/**
 * Records which language the user wants the app in. `SYSTEM_UI_LOCALE` puts it
 * back to following the browser.
 */
export function setUiLocale(locale: UiLocale | typeof SYSTEM_UI_LOCALE): void {
  updateAppPersistentState((state) => {
    state.appSettings.uiLocale = locale;
  });
}

/**
 * Puts the active catalog in context and swaps it when the user's choice
 * changes. Everything that renders a translated string must be a child of this.
 */
export const UiLocaleProvider = ({ children }: { children: ReactNode }) => {
  const locale = useUiLocale();

  useEffect(() => {
    if (i18n.locale !== locale) {
      void activateUiLocale(locale);
    }
  }, [locale]);

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
};
