import { INVALID_MOVE } from "boardgame.io/core";
import { Card, Location, MetaGameState, PlayerGameState } from "../../types";
import { isNullOrEmpty } from "../../common-methods";

export const getCurrentPlayer = (mgState: MetaGameState) => {
    return mgState.G.players[mgState.ctx.currentPlayer];
}

/**
 * Indexes G.districts[districtID].locations[locationID]. Returns undefined
 * (instead of throwing) when either index is out of range, so callers (the
 * placeWorker reducer) can reject with INVALID_MOVE instead of crashing.
 */
export const getCurrentLocation = (mgState: MetaGameState, districtID: number, locationID: number): Location | undefined => {
    const district = mgState.G.districts[districtID];
    return district?.locations[locationID];
}

export const takeFromHand = (player: PlayerGameState, cards: Card[]): Card[] | string => {
    if (isNullOrEmpty(cards))
        return [];

    let cardIds = cards.map(c => c.id);

    if (cardIds.length > player.hand.length || !cardIds.every(cid => player.hand.map(c => c.id).includes(cid)))
        return INVALID_MOVE;

    // `includes()` above only checks presence, not multiplicity: a repeated
    // id (e.g. [X, X]) can pass validation while only one X exists in hand.
    // Take from a working copy and bail on a missing index instead of
    // mutating player.hand — a stale indexOf(-1) fed into splice would
    // otherwise remove the LAST card in hand (splice(-1, 1)), not "nothing".
    const remaining = [...player.hand];
    const taken: Card[] = [];
    for (const cid of cardIds) {
        const index = remaining.findIndex(c => c.id === cid);
        if (index === -1) return INVALID_MOVE;
        taken.push(remaining.splice(index, 1)[0]);
    }

    player.hand = remaining;
    return taken;
}