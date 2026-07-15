import { memo, useMemo } from "react";
import { Card } from "@candyfight/shared/types";
import { LocationActionsEnum } from "@candyfight/shared/enums";
import { DistrictIconComponent } from "../icon-components/DistrictIconComponent";
import { PuzzleRequirement } from "./PuzzleRequirement";
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
    // Memoize district icons
    const districtIcons = useMemo(() =>
        card?.districtIds?.map(did => <DistrictIconComponent key={did} districtId={did} />),
        [card?.districtIds]
    );

    // Memoize primary effects text
    const primaryEffectsText = useMemo(() =>
        card?.primaryEffects?.map(e => e.name).join(", "),
        [card?.primaryEffects]
    );

    // Memoize secondary effects text
    const secondaryEffectsText = useMemo(() =>
        card?.secondaryEffects?.map(e => e.name).join(", "),
        [card?.secondaryEffects]
    );

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
                <div className="card-zone card-name">
                    {card.districtIds?.length > 0
                        ? districtIcons
                        : <div className="non-location-title">{card.name}</div>
                    }
                </div>
                {((card.primaryEffects?.length ?? 0) > 0 || (card.primaryResources?.length ?? 0) > 0) && (
                    <div className="card-zone card-zone-primary">
                        <div className="play">Play</div>
                        <div className="play-effect">
                            {[
                                ...(card.primaryResources?.map(r => `+${r.amount} ${r.resourceId}`) ?? []),
                                ...(primaryEffectsText ? [primaryEffectsText] : []),
                            ].join(", ")}
                        </div>
                    </div>
                )}
                {((card.secondaryEffects?.length ?? 0) > 0 || (card.secondaryResources?.length ?? 0) > 0) && (
                    <div className="card-zone card-zone-secondary">
                        <div className="reveal">Reveal</div>
                        <div className="reveal-effect">
                            {[
                                ...(card.secondaryResources?.map(r => `+${r.amount} ${r.resourceId}`) ?? []),
                                ...(secondaryEffectsText ? [secondaryEffectsText] : []),
                            ].join(", ")}
                            {card.secondaryEffects?.some(e => e.actionId === LocationActionsEnum.STRANGE_CANDY_PUZZLE) && (
                                <div style={{ marginTop: 2 }}><PuzzleRequirement /></div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

CardComponent.displayName = "CardComponent";
