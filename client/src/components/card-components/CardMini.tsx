import { Card } from "@candyfight/shared/types";
import { districtIcons } from "../ui/GameIcon";

const bg = '#e0d4fc';
const border = '2px solid #000';
const font = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;

export interface CardMiniProps {
    card: Card;
    width?: number;
    height?: number;
}

export const CardMini = ({ card, width = 105, height = 157 }: CardMiniProps) => (
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
                gap: 4,
                minHeight: 32,
            }}
        >
            {card.districtIds?.length > 0 ? (
                card.districtIds.map(id => (
                    <img key={id} src={districtIcons[id]} style={{ width: 16, height: 16 }} />
                ))
            ) : (
                <span style={{ fontSize: "10px", fontWeight: 900 }}>{card.name}</span>
            )}
        </div>

        <div style={{ borderBottom: "1px solid #000" }} />

        {/* Body */}
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
            {!!(card.primaryResources?.length || card.primaryEffects?.length) && !!card.secondaryEffects?.length && (
                <div style={{ borderTop: "1px solid #ddd" }} />
            )}
            {card.secondaryEffects?.map((e, i) => (
                <div key={i} style={{ fontSize: "10px" }}>
                    <div style={{ fontWeight: 900, fontSize: "9px", color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>Reveal</div>
                    {e.name}
                </div>
            ))}
            {!card.primaryResources?.length && !card.primaryEffects?.length && !card.secondaryEffects?.length && (
                <div style={{ fontSize: "10px", color: "#aaa", fontStyle: "italic" }}>—</div>
            )}
        </div>
    </div>
);
