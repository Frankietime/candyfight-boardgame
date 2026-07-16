import { memo, useMemo } from "react";
import { Card } from "@candyfight/shared/types";
import { getCardEffectText } from "@candyfight/shared/services/cardServices";
import { DistrictIconComponent } from "../icon-components/DistrictIconComponent";
import { PuzzleRequirement } from "./PuzzleRequirement";
import { AutoFitZone } from "./AutoFitZone";
import { cardCanvasSmall } from "../icon-components/constants";

export type CardComponentProps = {
    w?: number,
    h?: number,
    x?: number,
    y?: number,
    show?: boolean,
    onClick?: () => void,
    isSelected?: boolean,
    children?: React.ReactNode,
    card: Card,
    selectionColor?: string;
    isDisabled?: boolean;
}

export const CardComponent = memo(({
    card,
    x,
    y,
    h,
    isSelected,
    onClick,
    w,
    selectionColor,
    isDisabled,
}: CardComponentProps) => {
    // Memoize district icons — em-sized so the header AutoFitZone can shrink
    // them to fit (the Signet and any 4-icon card overflow at fixed px).
    const districtIcons = useMemo(() =>
        card?.districtIds?.map(did => <DistrictIconComponent key={did} districtId={did} size="2.4em" />),
        [card?.districtIds]
    );

    // Memoize the printed effect text — shared with CardMini so the two
    // renderers can't drift on what a card's reward text says.
    const effectText = useMemo(() => card && getCardEffectText(card), [card]);

    // Memoize class name computation
    const cardClassName = useMemo(() => {
        let className = "card";
        if (isSelected) {
            className += " selected";
            if (selectionColor) className += ` ${selectionColor}`;
        }
        if (isDisabled) className += " disabled";
        return className;
    }, [isSelected, selectionColor, isDisabled]);

    if (!card) return null;

    return (
        <div
            className="absolute"
            style={{
                top: y ?? 0,
                left: x ?? 0,
                width: w ?? 105,
                height: h ?? 157
            }}
            onClick={onClick}
        >
            {/* The canvas asset is a bare primitive: name/icons and effect text
                are overprinted on its dither band and two effect boxes. */}
            <div className={cardClassName}>
                <img className="card-canvas" src={cardCanvasSmall} alt="" draggable={false} />
                <AutoFitZone className="card-zone card-name">
                    {card.districtIds?.length > 0
                        ? districtIcons
                        : <div className="non-location-title">{card.name}</div>
                    }
                </AutoFitZone>
                {((card.primaryEffects?.length ?? 0) > 0 || (card.primaryResources?.length ?? 0) > 0) && (
                    <AutoFitZone className="card-zone card-zone-primary">
                        <div className="play-effect">{effectText?.playText}</div>
                    </AutoFitZone>
                )}
                {((card.secondaryEffects?.length ?? 0) > 0 || (card.secondaryResources?.length ?? 0) > 0) && (
                    <AutoFitZone className="card-zone card-zone-secondary">
                        <div className="reveal-effect">
                            {effectText?.revealText}
                            {effectText?.hasPuzzle && (
                                <div style={{ marginTop: 2 }}><PuzzleRequirement requirement={effectText.puzzleRequirement} /></div>
                            )}
                        </div>
                    </AutoFitZone>
                )}
            </div>
        </div>
    );
});

CardComponent.displayName = "CardComponent";
