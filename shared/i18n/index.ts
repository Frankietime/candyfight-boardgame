/**
 * Lightweight i18n technique — no runtime dependency.
 *
 * Messages are nested dictionaries looked up by dot-path key
 * (e.g. `translate("es", "tutorial.goal.title")`). Spanish is the default;
 * missing keys fall back to English, then to the raw key. `{var}` placeholders
 * are interpolated from `vars`.
 *
 * Pure and shared: `translate(locale, key)` is used both by client React
 * components (via the `useT` hook) and by any non-React code that has a locale.
 */
import { messages } from "./messages";

export type Locale = "es" | "en";
export const DEFAULT_LOCALE: Locale = "es";
export const LOCALES: Locale[] = ["es", "en"];

export type Messages = { [key: string]: string | Messages };

const lookup = (dict: Messages | undefined, key: string): string | undefined => {
    const value = key.split(".").reduce<string | Messages | undefined>(
        (node, part) => (node && typeof node !== "string" ? node[part] : undefined),
        dict
    );
    return typeof value === "string" ? value : undefined;
};

export const translate = (
    locale: Locale,
    key: string,
    vars?: Record<string, string | number>
): string => {
    const raw = lookup(messages[locale], key) ?? lookup(messages.en, key) ?? key;
    if (!vars) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, name) =>
        name in vars ? String(vars[name]) : `{${name}}`
    );
};
