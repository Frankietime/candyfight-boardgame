/**
 * OpponentMoveCard — modal reveal of a scripted opponent action.
 *
 * When the tutorial's scripted opponent plays a card, this shows the card large in a
 * centered modal (with a dimming backdrop) plus a short caption, so the player clearly
 * sees what the opponent did. Dismissing it (Continue) hands control back to the
 * controller, which then glows the location the opponent played at.
 */
import { createPortal } from "react-dom";
import type { Card } from "@candyfight/shared/types";
import { CardComponent } from "../card-components/CardComponent";
import { useT } from "../../i18n/useT";
import { renderBold } from "./richText";

export interface OpponentMoveCardProps {
    card?: Card;
    /** i18n key for the caption. */
    caption: string;
    /** Dismiss the modal (advances the tutorial to the location-focus phase). */
    onDismiss: () => void;
}

export const OpponentMoveCard = ({ card, caption, onDismiss }: OpponentMoveCardProps) => {
    const t = useT();
    return createPortal(
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 2000,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                backgroundColor: "rgba(0,0,0,0.6)",
            }}
        >
            <div
                style={{
                    backgroundColor: "#111",
                    color: "#fff",
                    border: "2px solid #000",
                    boxShadow: "4px 4px 0 #000",
                    padding: "6px 14px",
                    fontWeight: 900,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    fontSize: 13,
                    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
                }}
            >
                {renderBold(t(caption))}
            </div>

            {card && (
                <div style={{ position: "relative", width: 210, height: 314, boxShadow: "8px 8px 0 #000" }}>
                    <CardComponent card={card} x={0} y={0} w={210} h={314} show />
                </div>
            )}

            <button
                onClick={onDismiss}
                style={{
                    border: "2px solid #000",
                    backgroundColor: "#fef08a",
                    boxShadow: "4px 4px 0 #000",
                    padding: "10px 22px",
                    fontWeight: 900,
                    fontSize: 14,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    cursor: "pointer",
                    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
                }}
            >
                {t("tutorial.opponentContinue")}
            </button>
        </div>,
        document.body
    );
};
