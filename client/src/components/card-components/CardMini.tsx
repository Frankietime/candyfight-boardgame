import { Card } from "@candyfight/shared/types";
import { LocationActionsEnum } from "@candyfight/shared/enums";
import { districtIcons } from "../ui/GameIcon";
import { PuzzleRequirement } from "./PuzzleRequirement";

const bg = '#e0d4fc';
const border = '2px solid #000';
const font = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;

export interface CardMiniProps {
    card: Card;
    width?: number;
    height?: number;
    /** Header district-icon size in px. Crank it up when the card will be
     *  scaled down (played-card miniatures) so icons stay readable. */
    iconSize?: number;
    /** Hide the effect text (illegible when scaled down; avoids a scrollbar).
     *  The body stays blank — except the Signet, marked with a big "S". */
    showBody?: boolean;
}

export const CardMini = ({ card, width = 105, height = 157, iconSize = 16, showBody = true }: CardMiniProps) => (
    <div
        style={{
            width,
            height,
            backgroundColor: "#fff",
            border,
            fontFamily: font,
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            overflow: "hidden",
        }}
    >
        {/* Header — district icons or name */}
        <div
            style={{
                backgroundColor: bg,
                borderBottom: border,
                padding: "6px 8px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 4,
                minHeight: 32,
            }}
        >
            {card.districtIds?.length > 0 ? (
                card.districtIds.map(id => (
                    <img key={id} src={districtIcons[id]} style={{ width: iconSize, height: iconSize }} />
                ))
            ) : (
                <span style={{ fontSize: "10px", fontWeight: 900 }}>{card.name}</span>
            )}
        </div>

        <div style={{ borderBottom: "1px solid #000" }} />

        {/* Body — blank in miniature mode (big "S" marks the Signet) */}
        {!showBody ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {card.name?.toLowerCase() === "signet" && (
                    <span style={{ fontSize: 72, fontWeight: 900, lineHeight: 1 }}>S</span>
                )}
            </div>
        ) : (
        <div style={{ flex: 1, padding: "6px 8px", display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
            {card.primaryResources?.map((r, i) => (
                <div key={i} style={{ fontSize: "10px" }}>
                    <div style={{ fontWeight: 900, fontSize: "9px", color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>Play</div>
                    +{r.amount} {r.resourceId}
                </div>
            ))}
            {card.primaryEffects?.map((e, i) => (
                <div key={i} style={{ fontSize: "10px" }}>
                    <div style={{ fontWeight: 900, fontSize: "9px", color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>Play</div>
                    {e.name}
                </div>
            ))}
            {!!(card.primaryResources?.length || card.primaryEffects?.length) &&
                !!(card.secondaryEffects?.length || card.secondaryResources?.length) && (
                <div style={{ borderTop: "1px solid #ddd" }} />
            )}
            {card.secondaryResources?.map((r, i) => (
                <div key={`sr-${i}`} style={{ fontSize: "10px" }}>
                    <div style={{ fontWeight: 900, fontSize: "9px", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Reveal</div>
                    +{r.amount} {r.resourceId}
                </div>
            ))}
            {card.secondaryEffects?.map((e, i) => (
                <div key={i} style={{ fontSize: "10px" }}>
                    <div style={{ fontWeight: 900, fontSize: "9px", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Reveal</div>
                    {e.name}
                    {e.actionId === LocationActionsEnum.STRANGE_CANDY_PUZZLE && (
                        <div style={{ marginTop: 2 }}><PuzzleRequirement iconSize={12} /></div>
                    )}
                </div>
            ))}
            {!card.primaryResources?.length && !card.primaryEffects?.length &&
                !card.secondaryEffects?.length && !card.secondaryResources?.length && (
                <div style={{ fontSize: "10px", color: "#aaa", fontStyle: "italic" }}>—</div>
            )}
        </div>
        )}
    </div>
);
