/**
 * Neobrutalist ES/EN language switch. Reads/writes the locale in the app store.
 */
import { LOCALES } from "@candyfight/shared/i18n";
import { useLocale } from "./useT";

export const LanguageToggle = ({ style }: { style?: React.CSSProperties }) => {
    const [locale, setLocale] = useLocale();

    return (
        <div style={{ display: "inline-flex", border: "2px solid #000", boxShadow: "3px 3px 0 #000", ...style }}>
            {LOCALES.map((l, i) => (
                <button
                    key={l}
                    onClick={() => setLocale(l)}
                    style={{
                        padding: "6px 12px",
                        fontWeight: 900,
                        fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
                        cursor: "pointer",
                        border: "none",
                        borderLeft: i > 0 ? "2px solid #000" : "none",
                        backgroundColor: locale === l ? "#fef08a" : "#fff",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                    }}
                >
                    {l}
                </button>
            ))}
        </div>
    );
};
