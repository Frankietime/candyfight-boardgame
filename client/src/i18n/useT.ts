/**
 * React binding for the shared i18n technique.
 *
 * `const t = useT()` returns a translate function bound to the current locale
 * from the app store (Spanish by default). `useLocale()` exposes the locale and
 * setter for language toggles.
 */
import { useCallback } from "react";
import { translate, Locale } from "@candyfight/shared/i18n";
import { useAppStore } from "../store";

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

export const useT = (): TFunction => {
    const locale = useAppStore(s => s.locale);
    return useCallback<TFunction>((key, vars) => translate(locale, key, vars), [locale]);
};

export const useLocale = (): [Locale, (locale: Locale) => void] => {
    const locale = useAppStore(s => s.locale);
    const setLocale = useAppStore(s => s.setLocale);
    return [locale, setLocale];
};
