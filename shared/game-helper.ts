import { LocationCost, PlayerGameState, Location, Dictionary, GameState, District } from "./types";
import { isNullOrEmpty } from "./common-methods";
import { INITIAL_NUMBER_OF_WORKERS, NO_CARD_SELECTED } from "./constants";
import { ResourceEnum } from "./enums";
import { Card } from "../shared/types";
import { getInitialDeck } from "../shared/services/cardServices";
import _ from "lodash";
import { DefaultPluginAPIs } from "boardgame.io";
import { getInitialLocationReward } from "./services/locationServices";
import { getPlayersList } from "./services/moves/playerServices";

export const getInitialLocationsState = (districtName: string, districtId: string, names: string[]): Location[] => names.map<Location>((name, locIndex) => ({
    Id: districtName + "-" + locIndex.toString(),
    name,
    districtId: districtId,
    cost: getInitialLocationCost(districtId),      
    reward: getInitialLocationReward(),     
    isSelected: false,
    isDisabled: false
}));

export const getInitialLocationCost = (districtId: string): LocationCost => ({
    districtIconIds: [districtId],
    resources: [
        {resourceId: ResourceEnum.Candy, amount: 1},
        {resourceId: ResourceEnum.Loot, amount: 1},
    ]
});
export const getInitialPlayersViewModel = (G: GameState, numberOfPlayers: number) => {

}
export const getInitialPlayersState = (numberOfPlayers: number, plugins: DefaultPluginAPIs): Dictionary<PlayerGameState> => {
    let initialPlayersState: {[key: string]: PlayerGameState} = {};


    Array.from({ length: numberOfPlayers }).forEach((value: any, Id: number) => {

        let deck = plugins.random.Shuffle(getInitialDeck());
        // let hand = deck.splice(0,4);

        initialPlayersState[Id.toString()] = {
            id: Id.toString(),
            currentNumberOfWorkers: 0,
            maxNumberOfWorkers: INITIAL_NUMBER_OF_WORKERS,
            selectedCard: NO_CARD_SELECTED,
            hasPlayedCard: false,
            [ResourceEnum.Candy]: 8,
            [ResourceEnum.Loot]: 2,
            victoryPoints: 0,
            deck: deck,
            hand: [],
            discardPile: [],
            trashPile: [],
            hasRevealed: false,
        }
    });

    return initialPlayersState;
}

export const isPlayCardValid = (playerState: PlayerGameState, selectedCardId: string): boolean => {
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

export const resetEndPhaseTriggers = (G: GameState) => {
    G.roundEndingCounter = 0;
    getPlayersList(G).forEach(p => p.hasRevealed = false);
} 

export const playersSetup = (G: GameState) => {
    getPlayersList(G).forEach(p => {
        p.currentNumberOfWorkers = p.maxNumberOfWorkers;
    })
}

export const districtsSetup = (G: GameState) => {
    
    G.districts.forEach(d => {
        d.combatWinnerId = undefined;
        d.presence = {};

        d.locations.forEach(l => {
            l.isDisabled = false;
            l.isSelected = false;
            l.takenByPlayerID = undefined;
        })
    });
}

export const calculateCombatWinner = (district: District): string | undefined => {

    if (!isNullOrEmpty(district.presence)) {
        const ranking = 
            Object.keys(district.presence)
                .map(key => district.presence[key])
                .sort((a, b) => b.amount - a.amount);

        if (ranking != null && ranking.length == 1) {
            return ranking[0].playerID;
        } else {
            return ranking.length > 1 && ranking[0].amount > ranking[1].amount ? ranking[0].playerID : undefined;
        }
    }
    return undefined;

}
