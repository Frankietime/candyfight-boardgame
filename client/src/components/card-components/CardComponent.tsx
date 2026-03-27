import { memo, useMemo } from "react";
import { Card } from "@candyfight/shared/types";
import { DistrictIconComponent } from "../icon-components/DistrictIconComponent";

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
            className={`absolute hover:bg-white/50 ${isSelected ? 'bg-indigo-900/30' : ''}`}
            style={{
                top: y ?? 0,
                left: x ?? 0,
                width: w ?? 105,
                height: h ?? 157
            }}
            onClick={onClick}
        >
            <div className={cardClassName}>
                <div className="card-name">
                    <div>
                        {card.districtIds?.length > 0
                            ? districtIcons
                            : <div className="non-location-title">{card.name}</div>
                        }
                    </div>
                </div>
                <hr />
                <div className="card-body">
                    {(card.primaryEffects?.length ?? 0) > 0 && (
                        <div>
                            <hr />
                            <div className="play">Play</div>
                            <hr />
                            <div className="play-effect">{primaryEffectsText}</div>
                        </div>
                    )}
                    {(card.secondaryEffects?.length ?? 0) > 0 && (
                        <div>
                            <hr />
                            <div className="reveal">Reveal</div>
                            <hr />
                            <div className="reveal-effect">{secondaryEffectsText}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

CardComponent.displayName = "CardComponent";