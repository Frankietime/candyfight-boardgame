import { memo, useMemo } from "react";
import { isNullOrEmpty } from "@candyfight/shared/common-methods";
import { Card, District, Location, PlayerGameState } from "@candyfight/shared/types";
import { ResourceComponent } from "../icon-components/ResourceComponent";
import { DistrictIconComponent } from "../icon-components/DistrictIconComponent";
import { workerIconsByPlayerId } from "../icon-components/constants";
import { LocationActionsEnum } from "@candyfight/shared/enums";
import { isWorkerPlacementValid } from "@candyfight/shared/game-helper";

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
    isRestrictedArea
}: LocationComponentProps) => {
    const isClickDisabled = isDisabled || isRestrictedArea;

    // Memoize whether this location shows the glow effect
    const showGlow = useMemo(() =>
        !isRestrictedArea && !isSelected && !isDisabled &&
        isWorkerPlacementValid(player, { cost, reward } as Location, selectedCard ?? {} as Card),
        [isRestrictedArea, isSelected, isDisabled, player, cost, reward, selectedCard]
    );

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
                return <span key={`action-${index}`}><hr /><div className="reward-action-item">{action.name}</div></span>;
            })}
        </>
    ), [reward.resources, reward.actions]);

    return (
        <div
            className={`absolute border-2 border-solid ${isClickDisabled ? 'opacity-50 pointer-events-none bg-indigo-900/30' : 'hover:bg-white/50 cursor-pointer'}`}
            style={{ top: y, left: x }}
            onClick={isClickDisabled ? undefined : onClick}
        >
            <div className="location-component-container">                
                <div className={showGlow ? "location-container proto-glow" : "location-container"}>
                    
                    {/* Name */}
                    <div className="location-name-container">{name}</div>
                    
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

                    {/* Worker Area */}
                    {!isNullOrEmpty(takenByPlayerID) && (
                        <div className="worker-image-container">
                            <img src={workerIconsByPlayerId[parseInt(takenByPlayerID!)]}/>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

LocationComponent.displayName = "LocationComponent";
