/**
 * TutorialMode — the tutorial entry screen.
 *
 * Shows a replayable menu of the discrete chapters; selecting one mounts the
 * {@link TutorController} for that chapter. Closing returns to the lobby.
 */
import { useState } from "react";
import { tutorialChapters } from "@candyfight/shared/tutorial/chapters";
import { TutorController } from "./TutorController";
import { useT } from "../../i18n/useT";
import { LanguageToggle } from "../../i18n/LanguageToggle";

const nb = {
    bg: "#e0d4fc",
    cardBg: "#fff",
    border: "2px solid #000",
    accent: "#fef08a",
    font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
};

export interface TutorialModeProps {
    onClose: () => void;
}

export const TutorialMode = ({ onClose }: TutorialModeProps) => {
    const t = useT();
    const [active, setActive] = useState<number | null>(null);

    if (active !== null) {
        return <TutorController chapter={tutorialChapters[active]} onExit={() => setActive(null)} />;
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                width: "100%",
                backgroundColor: nb.bg,
                fontFamily: nb.font,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "40px 16px",
                boxSizing: "border-box",
            }}
        >
            <div style={{ width: "min(720px, 96vw)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 12 }}>
                    <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: "0.03em" }}>
                        🍬 {t("tutorial.menu.title")}
                    </h1>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <LanguageToggle />
                        <button
                            onClick={onClose}
                            style={{
                                border: nb.border,
                                backgroundColor: "#fff",
                                boxShadow: "4px 4px 0 #000",
                                padding: "8px 16px",
                                fontWeight: 900,
                                fontFamily: nb.font,
                                cursor: "pointer",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                            }}
                        >
                            {t("tutorial.menu.backToLobby")}
                        </button>
                    </div>
                </div>

                <p style={{ fontSize: 14, color: "#444", marginBottom: 24, lineHeight: 1.5 }}>
                    {t("tutorial.menu.subtitle")}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {tutorialChapters.map((chapter, i) => (
                        <button
                            key={chapter.id}
                            onClick={() => setActive(i)}
                            style={{
                                textAlign: "left",
                                backgroundColor: nb.cardBg,
                                border: nb.border,
                                boxShadow: "5px 5px 0 #000",
                                padding: "16px 18px",
                                cursor: "pointer",
                                fontFamily: nb.font,
                                display: "flex",
                                alignItems: "center",
                                gap: 16,
                            }}
                        >
                            <span
                                style={{
                                    flexShrink: 0,
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    backgroundColor: nb.accent,
                                    border: nb.border,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 900,
                                    fontSize: 16,
                                }}
                            >
                                {i + 1}
                            </span>
                            <span style={{ flex: 1 }}>
                                <span style={{ display: "block", fontSize: 16, fontWeight: 900 }}>
                                    {t(chapter.title).replace(/^\d+\s·\s/, "")}
                                </span>
                                <span style={{ display: "block", fontSize: 13, color: "#666", marginTop: 3 }}>
                                    {t(chapter.summary)}
                                </span>
                            </span>
                            <span style={{ fontWeight: 900, fontSize: 18 }}>▸</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
