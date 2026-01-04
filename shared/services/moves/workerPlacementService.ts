import { MetaGameState, PlayerGameState, Location, Card } from "../../types";
import { actionRegistry } from "../../actions";
import { discard } from "./moves";

export interface PlaceWorkerParams {
    mgState: MetaGameState;
    player: PlayerGameState;
    location: Location;
    card: Card;
    moveParams?: any;
}

/**
 * Executes a complete worker placement action.
 *
 * Pipeline: playCard -> payCosts -> collectRewards -> claimLocation
 */
export const placeWorker = (params: PlaceWorkerParams): void => {
    const { mgState, player, location, card, moveParams } = params;

    playCard(player, card, mgState, location);
    payCosts(player, location, mgState, moveParams);
    collectRewards(player, location, mgState);
    claimLocation(mgState, player, location);
};

/**
 * Plays a card: discards it, applies effects and resources, updates player state.
 */
const playCard = (
    player: PlayerGameState,
    card: Card,
    mgState: MetaGameState,
    location: Location
): void => {
    discard(player, [card]);

    // Apply card effects (complex actions)
    card.primaryEffects?.forEach(effect => {
        actionRegistry.execute(
            effect.actionId,
            effect.params ?? {},
            mgState,
            player,
            { location }
        );
    });

    // Apply card resources (simple +/- values)
    card.primaryResources?.forEach(res => {
        player[res.resourceId] += res.amount;
    });

    player.currentNumberOfWorkers -= 1;
    player.hasPlayedCard = true;
    player.cardsInPlay?.push(card);
};

/**
 * Pays the location's entry costs: deducts resources and executes cost actions.
 */
const payCosts = (
    player: PlayerGameState,
    location: Location,
    mgState: MetaGameState,
    moveParams?: any
): void => {
    // Deduct resource costs
    location.cost.resources?.forEach(res => {
        player[res.resourceId] -= res.amount;
    });

    // Execute cost actions (may use moveParams for user input)
    location.cost.actions?.forEach(action => {
        const params = moveParams ?? action.params ?? {};
        actionRegistry.execute(
            action.actionId,
            params,
            mgState,
            player,
            { location }
        );
    });
};

/**
 * Collects rewards from the location: adds resources and executes reward actions.
 */
const collectRewards = (
    player: PlayerGameState,
    location: Location,
    mgState: MetaGameState
): void => {
    // Add resource rewards
    location.reward.resources?.forEach(res => {
        player[res.resourceId] += res.amount;
    });

    // Execute reward actions
    location.reward.actions?.forEach(action => {
        actionRegistry.execute(
            action.actionId,
            action.params ?? {},
            mgState,
            player,
            { location }
        );
    });
};

/**
 * Claims the location: marks it as taken and updates district presence.
 */
const claimLocation = (
    mgState: MetaGameState,
    player: PlayerGameState,
    location: Location
): void => {
    location.isDisabled = true;
    location.isSelected = true;
    location.takenByPlayerID = mgState.ctx.currentPlayer;

    const district = mgState.G.districts.find(d => d.id === location.districtId);
    if (district) {
        const currentPresence = district.presence[player.id]?.amount ?? 0;
        district.presence[player.id] = {
            playerID: player.id,
            amount: currentPresence + 1
        };
    }
};
