import "./LocationComponent.scss";
import { isNullOrEmpty } from "../../../../shared/common-methods";
import { Card, District, Location, PlayerGameState } from "../../../../shared/types";
import { useBoardComponent } from "../board-component/UseBoardComponent";
import { ResourceComponent } from "../icon-components/ResourceComponent";
import { DistrictIconComponent } from "../icon-components/DistrictIconComponent";
import { workerIconsByPlayerId } from "../icon-components/constants";
import { LocationMovesEnum } from "../../../../shared/enums";
import { isWorkerPlacementValid } from "../../../../shared/game-helper";
import { useAppStore } from "../../store";

export interface LocationComponentProps extends Location {
    x: number,
    y: number,
    district: District,
    show?: boolean,
    isSelected?: boolean;
    onClick: (event: any) => void,
    isDisabled: boolean;
    selectedCard?: Card;
    player: PlayerGameState;
}

export const LocationComponent = ({
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

    const { ClickBox } = useBoardComponent();

    const { playerState } = useAppStore();

    return ( 
        <ClickBox 
            _onClick={onClick}
            disabled={isDisabled || isRestrictedArea}
            x={x} y={y} 
            show={true}>
            <div className="location-component-container">                
                {/* <div className="location-container" style={{outline: !isSelected && !isDisabled && isWorkerPlacementValid(player, { cost, reward } as Location, selectedCard ?? {} as Card) ? "3px solid aqua" : "none"}}> */}
                <div className={!isRestrictedArea && !isSelected && !isDisabled && isWorkerPlacementValid(player, { cost, reward } as Location, selectedCard ?? {} as Card) ? "location-container proto-glow" : "location-container"}>
                    
                    {/* Name */}
                    <div className="location-name-container">{name}</div>
                    
                    <div className="grid grid-flow-col grid-rows-1 grid-cols-2">
                        {/* Cost */}
                        <div className="location-cost-container col-span-1">
                            <div>
                                {/* Location Icons Cost */}
                                <div className="location-icons-container">
                                    {cost.districtIconIds.map(did => 
                                        <DistrictIconComponent key={did} districtId={did} />
                                    )}
                                </div>
                                {/* Location Resources Cost */}
                                <div className="location-resource-cost-container">
                                    <div>
                                    {cost.resources?.map((resource, index) => 
                                        <ResourceComponent key={index} resourceId={resource.resourceId ?? ""} amount={resource.amount} />
                                    )}
                                    {cost.moves?.map((move, index) => {
                                       if (move.moveId == LocationMovesEnum.DISCARD || move.moveId == LocationMovesEnum.TRASH) {
                                            return Array.from({ length: move.params?.selectionNumber }).map((_, index: number) => <ResourceComponent key={index} resourceId={move.moveId ?? ""} />)
                                        } else {
                                            return <></>
                                        } 
                                    })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reward */}
                        <div className="location-reward-container col-span-3">
                            <div style={{overflowWrap: "break-word"}}>
                                {/* Resources and Moves Reward */}
                                <div className="">
                                    {reward.resources?.map((resource, index) => 
                                        <ResourceComponent key={index} resourceId={resource.resourceId} amount={resource.amount}/>
                                    )}
                                    {reward != undefined && reward.moves && reward.moves?.length > 0 ? 
                                        reward.moves.map((move, index) => {
                                            if (move.moveId == LocationMovesEnum.DISCARD || move.moveId == LocationMovesEnum.TRASH || move.moveId == LocationMovesEnum.DRAW) {
                                                return Array.from({ length: move.params?.selectionNumber }).map((_, index: number) => <ResourceComponent key={index} resourceId={move.moveId ?? ""} />)
                                            } else {
                                                return <span key={index}><hr></hr><div className="reward-move-item" key={index}>{move.name}</div></ span>
}                                        })
                                        : <></>}
                                </div>
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
        </ClickBox>
    );
}
