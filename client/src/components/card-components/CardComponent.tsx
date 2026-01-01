import { Card } from "@candyfight/shared/types";
import { useBoardComponent } from "../board-component/UseBoardComponent";
import { DistrictIconComponent } from "../icon-components/DistrictIconComponent";
import "./CardComponent.scss"

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
export const CardComponent = ({
    card,
    x,
    y,
    children,
    h, 
    isSelected,
    onClick,
    show,
    w,
    selectionColor,
    isDisabled,
}: CardComponentProps) => {

    const { EventBox } = useBoardComponent();
    return (
        <EventBox 
            x={x ?? 0}
            y={y ?? 0}
            key={x + "-" + y}
            w={w ?? 105} 
            h={h ?? 157} 
            isSelected={isSelected}
            onClick={onClick}
        > 
        {card != null && (
            <div className={"card" + (isSelected ? " selected" + (selectionColor ? " " + selectionColor : "") : "" + (isDisabled ? " disabled" : ""))}>
                <div className="card-name">
                    <div>{card.districtIds.length > 0 ? card.districtIds
                        .map(did => (<DistrictIconComponent key={did} districtId={did} />)) : <div className="non-location-title">{card.name}</div>}</div>
                </div>
            <hr></hr>
            <div className="card-body">
                {card?.districtIds.length > 0 && 
                <div>
                </div>
                }
                {card.primaryEffects != null &&
                <div>
                    <hr></hr>
                    <div  className="play">Play</div>
                    <hr></hr> 
                    <div className="play-effect">{card?.primaryEffects?.name}</div>
                </div>
                }
                {card?.secondaryEffects != null &&
                <div>
                    <hr></hr>
                    <div className="reveal">Reveal</div>
                    <hr></hr>
                    <div className="reveal-effect">{card?.secondaryEffects.name}</div>
                </div>
                }
                </div>
            </div>
        )}
        </EventBox>);
    }