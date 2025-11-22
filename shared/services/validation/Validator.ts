import { PlayerGameState, Location, Card } from "../../types";
import { isNullOrEmpty } from "../../common-methods";
import { NO_CARD_SELECTED } from "../../constants";

export const isPlayCardValid = (playerState: PlayerGameState, selectedCardId: string | undefined): boolean => {
    return !playerState.hasPlayedCard && selectedCardId !== NO_CARD_SELECTED;
}

export const isWorkerPlacementValid = (playerState: PlayerGameState, currentLocation: Location, cardInPlay: Card): boolean => {
    return (
        !playerState.hasPlayedCard && playerState.currentNumberOfWorkers > 0 &&
        isNullOrEmpty(currentLocation.takenByPlayerID)
        && currentLocation.cost.districtIconIds.every(lid => cardInPlay!.districtIds.includes(lid))
        && (
            currentLocation.cost.resources ? currentLocation.cost.resources.every(resource => playerState[resource.resourceId] >= resource.amount) : true)
    );
}

export const canBuyCard = (player: PlayerGameState, card: Card): boolean => {
    if (!card.cost) return true;
    return card.cost.every(cost => player[cost.resourceId] >= cost.amount);
}
