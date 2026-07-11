import { memo, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { isNullOrEmpty } from "@candyfight/shared/common-methods";
import { Card, District, Location, PlayerGameState } from "@candyfight/shared/types";
import { ResourceComponent } from "../icon-components/ResourceComponent";
import { DistrictIconComponent } from "../icon-components/DistrictIconComponent";
import { WorkerIcon } from "../ui/GameIcon";
import { LocationActionsEnum } from "@candyfight/shared/enums";
import { isWorkerPlacementValid } from "@candyfight/shared/game-helper";
import { playerSeatColor } from "@candyfight/shared/constants";
import { CardMini } from "../card-components/CardMini";

export interface LocationComponentProps extends Location {
    x: number,
    y: number,
    district: District,
    show?: boolean,
    isSelected?: boolean;
    onClick: () => void,
    isDisabled: boolean;
    selectedCard?: Card;
    player: PlayerGameState;
    marketCards?: Card[];
    /** Tutorial signal anchor id (set on the root element so overlays can target it). */
    tutorAnchorId?: string;
}

export const LocationComponent = memo(({
    x, y,
    district,
    show = true,
    onClick,
    name,
    cost,
    reward,
    isSelected,
    isDisabled,
    takenByPlayerID,
    selectedCard,
    player,
    isRestrictedArea,
    marketCards,
    tutorAnchorId,
}: LocationComponentProps) => {
    const isClickDisabled = isDisabled || isRestrictedArea;
    const isTaken = !isNullOrEmpty(takenByPlayerID);
    const isMarket = !!reward.actions?.some(a => a.actionId === LocationActionsEnum.BUY_CARD);
    const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

    // Glow marks a playable spot. With a card selected: only that card's valid
    // placements. With NO card selected: the general view — any location
    // playable with ANY card in the hand glows. (The isDisabled prop can't
    // gate this: it's true whenever no card is selected.)
    const showGlow = useMemo(() => {
        if (isRestrictedArea || isSelected || isTaken) return false;
        if (name.includes("Sword Master") && player.maxNumberOfWorkers >= 3) return false;
        const loc = { cost, reward, isRestrictedArea, takenByPlayerID } as Location;
        if (selectedCard?.districtIds) {
            return isWorkerPlacementValid(player, loc, selectedCard);
        }
        return (player.hand ?? []).some(c => !!c?.districtIds && isWorkerPlacementValid(player, loc, c));
    }, [isRestrictedArea, isSelected, isTaken, name, player, cost, reward, takenByPlayerID, selectedCard]);

    // Memoize cost icons
    const costIcons = useMemo(() =>
        cost.districtIconIds.map(did =>
            <DistrictIconComponent key={did} districtId={did} />
        ),
        [cost.districtIconIds]
    );

    // Memoize cost resources
    const costResources = useMemo(() => (
        <>
            {cost.resources?.map((resource, index) =>
                <ResourceComponent key={`res-${index}`} resourceId={resource.resourceId ?? ""} amount={resource.amount} />
            )}
            {cost.actions?.map((action, actionIndex) => {
                if (action.actionId === LocationActionsEnum.DISCARD || action.actionId === LocationActionsEnum.TRASH) {
                    return Array.from({ length: action.params?.selectionNumber }).map((_, i) =>
                        <ResourceComponent key={`action-${actionIndex}-${i}`} resourceId={action.actionId ?? ""} />
                    );
                }
                return null;
            })}
        </>
    ), [cost.resources, cost.actions]);

    // Memoize reward display
    const rewardDisplay = useMemo(() => (
        <>
            {reward.resources?.map((resource, index) =>
                <ResourceComponent key={`reward-${index}`} resourceId={resource.resourceId} amount={resource.amount}/>
            )}
            {reward?.actions?.map((action, index) => {
                if (action.actionId === LocationActionsEnum.DISCARD || action.actionId === LocationActionsEnum.TRASH || action.actionId === LocationActionsEnum.DRAW) {
                    return Array.from({ length: action.params?.selectionNumber }).map((_, i) =>
                        <ResourceComponent key={`reward-action-${index}-${i}`} resourceId={action.actionId ?? ""} />
                    );
                }
                // Stubbed mechanic — hidden from the tile until it actually does something.
                if (action.actionId === LocationActionsEnum.ADVANCE_TRACKER) return null;
                return <span key={`action-${index}`}><hr /><div className="reward-action-item">{action.name}</div></span>;
            })}
        </>
    ), [reward.resources, reward.actions]);

    const takenPlayerClass = isTaken ? `location-taken player-taken-${takenByPlayerID}` : "";

    const TILE_W = 1280 / 12;
    const TILE_H = 720 / 12;

    return (
        <>
        <div
            {...(tutorAnchorId ? { "data-tutor-id": tutorAnchorId } : {})}
            className={`location-tile absolute border-2 border-solid ${
          isTaken
            ? takenPlayerClass
            : isClickDisabled
              ? ''
              : 'hover:brightness-110 cursor-pointer'
        }${!isTaken && !showGlow ? ' location-unplayable' : ''}`}
            style={{
                top: y, left: x, width: TILE_W, height: TILE_H, boxSizing: "content-box",
                // Claimed locations: thin seat-color border marks the owner;
                // the tile content is grayed out via .location-taken CSS.
                ...(isTaken ? {
                    borderColor: playerSeatColor(takenByPlayerID!),
                } : {}),
            }}
            onClick={isClickDisabled || isTaken ? undefined : onClick}
            onMouseEnter={isMarket && marketCards?.length ? (e) => setHoverPos({ x: e.clientX, y: e.clientY }) : undefined}
            onMouseMove={isMarket && marketCards?.length ? (e) => setHoverPos({ x: e.clientX, y: e.clientY }) : undefined}
            onMouseLeave={isMarket ? () => setHoverPos(null) : undefined}
        >
            <div className={`location-component-container district-${district.id}`}>
                <div className={showGlow ? "location-container proto-glow" : "location-container"}>

                    {/* Name */}
                    <div className={`location-name-container district-name-${district.id}`}>{name}</div>

                    <div className="grid grid-flow-col grid-rows-1 grid-cols-2">
                        {/* Cost */}
                        <div className="location-cost-container col-span-1">
                            <div>
                                {/* Location Icons Cost */}
                                <div className="location-icons-container">
                                    {costIcons}
                                </div>
                                {/* Location Resources Cost */}
                                <div className="location-resource-cost-container">
                                    <div>{costResources}</div>
                                </div>
                            </div>
                        </div>

                        {/* Reward */}
                        <div className="location-reward-container col-span-3">
                            <div style={{overflowWrap: "break-word"}}>
                                {/* Resources and Moves Reward */}
                                <div>{rewardDisplay}</div>
                            </div>
                        </div>
                    </div>

                    {/* Worker Area — flashes once when the worker is placed (mount) */}
                    {isTaken && (
                        <div className="worker-image-container worker-placed-flash">
                            <WorkerIcon playerId={parseInt(takenByPlayerID!)} size="sm" />
                        </div>
                    )}
                </div>
            </div>
        </div>
        {hoverPos && isMarket && marketCards?.length ? createPortal(
            <MarketPopover cards={marketCards} anchorX={hoverPos.x} anchorY={hoverPos.y} />,
            document.body
        ) : null}
        </>
    );
});

LocationComponent.displayName = "LocationComponent";

const CARD_W = 80;
const CARD_H = 120;
const GAP = 6;
const PADDING = 8;

const MarketPopover = ({ cards, anchorX, anchorY }: { cards: Card[]; anchorX: number; anchorY: number }) => {
    const totalW = cards.length * CARD_W + (cards.length - 1) * GAP + PADDING * 2;
    const totalH = CARD_H + PADDING * 2;
    const left = Math.max(8, Math.min(anchorX - totalW / 2, window.innerWidth - totalW - 8));
    const top = Math.max(8, anchorY - totalH - 12);

    return (
        <div
            style={{
                position: "fixed",
                left,
                top,
                display: "flex",
                gap: GAP,
                padding: PADDING,
                zIndex: 200,
                pointerEvents: "none",
                backgroundColor: "#111",
                border: "2px solid #000",
                boxShadow: "4px 4px 0 #000",
            }}
        >
            {cards.map(card => (
                <CardMini key={card.id} card={card} width={CARD_W} height={CARD_H} />
            ))}
        </div>
    );
};
