import { Card } from "@candyfight/shared/types";
import { getCardEffectText } from "@candyfight/shared/services/cardServices";
import { districtIcons } from "../ui/GameIcon";
import { cardCanvasSmall } from "../icon-components/constants";
import { PuzzleRequirement } from "./PuzzleRequirement";

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

/**
 * Compact card — SAME canvas asset + zone system as CardComponent (.card /
 * .card-canvas / .card-zone are percentage-positioned, so they scale to any
 * width/height). Used by the market popover, log hovers, played-card minis,
 * the player detail modal and the Mod Lab.
 */
export const CardMini = ({ card, width = 105, height = 157, iconSize = 16, showBody = true }: CardMiniProps) => {
    const { playText, revealText, hasPuzzle, puzzleRequirement } = getCardEffectText(card);

    return (
        <div style={{ width, height, position: "relative", flexShrink: 0 }}>
            <div className="card" style={{ fontSize: Math.max(6, Math.round(9 * (width / 105))) }}>
                <img className="card-canvas" src={cardCanvasSmall} alt="" draggable={false} />

                {/* Header — district icons or name */}
                <div className="card-zone card-name">
                    {card.districtIds?.length > 0 ? (
                        card.districtIds.map(id => (
                            <img key={id} src={districtIcons[id]} style={{ width: iconSize, height: iconSize, display: "inline-block", margin: "0 1px" }} />
                        ))
                    ) : (
                        <div className="non-location-title">{card.name}</div>
                    )}
                </div>

                {!showBody ? (
                    card.name?.toLowerCase() === "signet" && (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: "5em", fontWeight: 900, lineHeight: 1 }}>S</span>
                        </div>
                    )
                ) : (
                    <>
                        {playText && (
                            <div className="card-zone card-zone-primary">
                                <div className="play-effect">{playText}</div>
                            </div>
                        )}
                        {(revealText || hasPuzzle) && (
                            <div className="card-zone card-zone-secondary">
                                <div className="reveal-effect">
                                    {revealText}
                                    {hasPuzzle && <div><PuzzleRequirement requirement={puzzleRequirement} /></div>}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
