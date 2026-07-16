/**
 * paramSynthesis — Stage B: build `moveParams` for input-requiring locations
 * (DISCARD / TRASH cost, BUY_CARD reward) so `enumerate` can emit complete,
 * legal `placeWorker` moves for the card-buying/economy line.
 *
 * Branching is intentionally capped: ONE heuristic choice per location+card
 * pair (discard/trash the lowest-value cards, buy the highest-value market
 * card) instead of enumerating every subset. The value heuristic is pluggable
 * via `cardValue`.
 */
import { GameState, PlayerGameState, Location, Card } from "../types";
import { LocationActionsEnum } from "../enums";
import { MIN_COLLECTION_SIZE } from "../constants";
import { marketRowFor } from "../services/marketServices";
import { createParams } from "../actions/action-params";
import { actionRegistry } from "../actions";
import { WorkerMoveParams } from "../services/moves/workerPlacementService";

/**
 * Rough card strength: flexibility (district icons) + printed value.
 * Used to pick throwaway cards (lowest) and market buys (highest).
 */
export const cardValue = (card: Card): number =>
    card.districtIds.length +
    (card.primaryResources?.reduce((s, r) => s + r.amount, 0) ?? 0) +
    (card.primaryEffects?.length ?? 0);

/**
 * Synthesize the `moveParams` needed to place `playedCard` at `location`,
 * or null when the location's input requirements cannot be satisfied
 * (not enough spare cards, empty market, unsupported action type).
 *
 * `precomputed` lets a caller that evaluates every hand card against the
 * same location (e.g. botEnumerate's per-location loop) hoist the
 * location-only work — the hand sort and the market row — out of the
 * per-card call instead of redoing it for every card.
 */
export function synthesizeMoveParams(
    G: GameState,
    player: PlayerGameState,
    location: Location,
    playedCard: Card,
    precomputed?: { sortedHand?: Card[]; marketRow?: Card[] }
): WorkerMoveParams | null {
    const result: WorkerMoveParams = {};

    // ── cost actions: pay with the lowest-value spare cards ────────────────
    const inputCosts = (location.cost.actions ?? []).filter(a =>
        actionRegistry.requiresInput(a.actionId)
    );
    // costParams is shared by every cost action of the location, so two
    // input-requiring cost actions can't be expressed independently.
    if (inputCosts.length > 1) return null;

    if (inputCosts.length === 1) {
        const action = inputCosts[0];
        const count: number = action.params?.selectionNumber ?? 1;
        const sortedHand = precomputed?.sortedHand
            ?? [...player.hand].sort((a, b) => cardValue(a) - cardValue(b));
        const spare = sortedHand.filter(c => c.id !== playedCard.id);
        if (spare.length < count) return null;
        const cardIds = spare.slice(0, count).map(c => c.id);

        switch (action.actionId) {
            case LocationActionsEnum.DISCARD:
                result.costParams = createParams.discard(cardIds);
                break;
            case LocationActionsEnum.TRASH: {
                // Same guard as the trash handler: the remaining collection
                // must keep at least MIN_COLLECTION_SIZE cards after trashing.
                const total = player.deck.length + player.discardPile.length + player.hand.length;
                if (total - count < MIN_COLLECTION_SIZE) return null;
                result.costParams = createParams.trash(cardIds);
                break;
            }
            default:
                return null; // unknown input-requiring cost — cannot synthesize
        }
    }

    // ── reward actions: buy the highest-value visible market card ──────────
    const inputRewards = (location.reward.actions ?? []).filter(a =>
        actionRegistry.requiresInput(a.actionId)
    );
    if (inputRewards.length > 1) return null;

    if (inputRewards.length === 1) {
        const action = inputRewards[0];
        if (action.actionId !== LocationActionsEnum.BUY_CARD) return null;

        const row = precomputed?.marketRow ?? marketRowFor(G, location);
        if (row.length === 0) return null;
        const best = [...row].sort((a, b) => cardValue(b) - cardValue(a))[0];
        result.rewardParams = createParams.buyCard(best.id);
    }

    return result;
}
