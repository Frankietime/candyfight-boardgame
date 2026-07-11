/**
 * TutorDialog — the narration box for the active step.
 *
 * Shows the step text, chapter progress, and a single **Advance** button that is
 * disabled until the step's interaction is satisfied (`canAdvance`). For pure-
 * narration / opponent-confirmation steps the button is always enabled.
 */
import { createPortal } from "react-dom";
import type { TutorChapter } from "@candyfight/shared/tutorial/types";
import { useT } from "../../i18n/useT";
import { renderBold } from "./richText";

const nb = {
    bg: "#e0d4fc",
    border: "2px solid #000",
    font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
};

export interface TutorDialogProps {
    chapter: TutorChapter;
    stepIndex: number;
    /** i18n key for the step narration. */
    text: string;
    canAdvance: boolean;
    /** When false the step auto-advances on completion, so no Next button is shown. */
    showAdvanceButton?: boolean;
    /** i18n key for the gate hint shown while the button is disabled. */
    gateHint?: string;
    onAdvance: () => void;
    onExit: () => void;
    isLastStep: boolean;
    /** Raise above real phase modals (e.g. combat results) so it stays readable. */
    elevated?: boolean;
    /**
     * A modal owns the screen center: dock the narration top-right and show an
     * arrow pointing down-left toward the modal's info.
     */
    anchorTopRight?: boolean;
}

export const TutorDialog = ({
    chapter,
    stepIndex,
    text,
    canAdvance,
    showAdvanceButton = true,
    gateHint,
    onAdvance,
    onExit,
    isLastStep,
    elevated = false,
    anchorTopRight = false,
}: TutorDialogProps) => {
    const t = useT();
    // Rendered in a body portal so `elevated` can sit above modals (e.g. the Radix
    // card-selection dialog) regardless of any transformed/isolated ancestor.
    return createPortal(
        <div
            data-tutor-id="tutor-dialog"
            style={{
                position: "fixed",
                ...(anchorTopRight
                    ? { top: 18, right: 18, width: "min(440px, 90vw)" }
                    : { bottom: 18, left: "50%", transform: "translateX(-50%)", width: "min(720px, 94vw)" }),
                zIndex: elevated ? 2147483646 : 1100,
                backgroundColor: "#fff",
                border: nb.border,
                boxShadow: "6px 6px 0 #000",
                fontFamily: nb.font,
            }}
        >
            {/* Arrow pointing down-left, toward the modal's info at screen center */}
            {anchorTopRight && (
                <svg
                    className="tutor-modal-arrow"
                    width="120"
                    height="120"
                    viewBox="0 0 120 120"
                    style={{
                        position: "absolute",
                        left: -126,
                        bottom: -104,
                        overflow: "visible",
                        pointerEvents: "none",
                        filter: "drop-shadow(0 0 5px rgba(255, 39, 51, 0.85))",
                    }}
                >
                    <line x1="106" y1="14" x2="34" y2="86" stroke="#ff2733" strokeWidth="8" strokeLinecap="round" />
                    <polygon points="12,108 42,94 26,78" fill="#ff2733" />
                </svg>
            )}
            {/* Header */}
            <div
                style={{
                    backgroundColor: nb.bg,
                    borderBottom: nb.border,
                    padding: "8px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <span style={{ fontWeight: 900, letterSpacing: "0.04em" }}>
                    {t(chapter.title)}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#555" }}>
                        {t("common.step", { n: stepIndex + 1, total: chapter.steps.length })}
                    </span>
                    <button
                        onClick={onExit}
                        title={t("common.exitTutorial")}
                        style={{
                            border: nb.border,
                            backgroundColor: "#fff",
                            boxShadow: "2px 2px 0 #000",
                            width: 28,
                            height: 28,
                            cursor: "pointer",
                            fontWeight: 900,
                            fontFamily: nb.font,
                        }}
                    >
                        ✕
                    </button>
                </span>
            </div>

            {/* Body */}
            <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 16 }}>
                <p style={{ flex: 1, margin: 0, fontSize: 15, lineHeight: 1.5, color: "#111" }}>
                    {renderBold(t(text))}
                </p>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    {showAdvanceButton ? (
                        <button
                            onClick={onAdvance}
                            disabled={!canAdvance}
                            style={{
                                border: nb.border,
                                boxShadow: canAdvance ? "4px 4px 0 #000" : "none",
                                transform: canAdvance ? undefined : "translate(4px, 4px)",
                                padding: "10px 22px",
                                fontSize: 15,
                                fontFamily: nb.font,
                                fontWeight: 900,
                                cursor: canAdvance ? "pointer" : "not-allowed",
                                backgroundColor: canAdvance ? "#fef08a" : "#eee",
                                color: canAdvance ? "#000" : "#999",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {t(isLastStep ? "common.finish" : "common.next")}
                        </button>
                    ) : (
                        // Auto-advance step: prompt the action instead of a Next button.
                        <span
                            style={{
                                fontSize: 12,
                                fontWeight: 800,
                                color: canAdvance ? "#16a34a" : "#a16207",
                                maxWidth: 200,
                                textAlign: "right",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {canAdvance ? "✓" : gateHint ? t(gateHint) : ""}
                        </span>
                    )}
                    {showAdvanceButton && !canAdvance && gateHint && (
                        <span style={{ fontSize: 11, color: "#a16207", fontWeight: 700, maxWidth: 180, textAlign: "right" }}>
                            {t(gateHint)}
                        </span>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
