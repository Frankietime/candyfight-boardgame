/**
 * botEnumerate — valid-move enumeration for boardgame.io bots.
 *
 * Wired into `Game.ai.enumerate`. Returns the list of legal moves for the
 * acting player in the current phase, so RandomBot / greedy / MCTS can pick
 * among them. Every emitted move MUST be accepted by the reducer (never
 * INVALID_MOVE) and must never produce an illegal free claim.
 *
 * Input-requiring locations (DISCARD / TRASH cost, BUY_CARD reward — Markets,
 * High Council, Bargain, Momentum, Time for Candy) are covered by Stage B
 * param synthesis: `synthesizeMoveParams` builds the `moveParams.cardIds` /
 * `targetCardId` choice, and the move is re-validated with the reducer's own
 * `validatePlacementActions` before being emitted.
 */
import { Ctx } from "boardgame.io";
import { GameState, Location, MetaGameState } from "../types";
import { CharacterEnum } from "../enums";
import { getPlayersList } from "../services/moves/playerServices";
import { isWorkerPlacementValid } from "../game-helper";
import { validatePlacementActions } from "../services/moves/workerPlacementService";
import { synthesizeMoveParams } from "./paramSynthesis";
// Importing the actions barrel auto-registers the core actions, so
// `requiresInput` reflects the real inputSpecs.
import { actionRegistry } from "../actions";

export type BotMove = { move: string; args: any[] };

/**
 * Draw cap: a bot heuristic (not a game rule) to stop the search looping on
 * unbounded draws. The `draw` move has no engine hand-size ceiling.
 */
export const DRAW_CAP = 8;

/**
 * Enumerate legal moves for the acting player in the current phase.
 *
 * @param playerID The seat boardgame.io is asking about. In phases with
 *   `activePlayers: { all }` (character selection, combat, endgame) each seat
 *   acts on itself, so `playerID` matters. In `mainPhase` the reducer's moves
 *   operate on `ctx.currentPlayer`, which is the same seat being asked.
 */
export function enumerate(G: GameState, ctx: Ctx, playerID?: string): BotMove[] {
    switch (ctx.phase) {
        case "characterSelectionPhase":
            return enumerateCharacterSelection(G, ctx, playerID);
        case "mainPhase":
            return enumerateMainPhase(G, ctx);
        case "combatPhase":
            return [{ move: "endRound", args: [] }];
        case "endGamePhase":
            return [{ move: "goToLobby", args: [] }];
        // maintenancePhase has no player moves (auto via onBegin/endIf).
        case "maintenancePhase":
        default:
            return [];
    }
}

function enumerateCharacterSelection(G: GameState, ctx: Ctx, playerID?: string): BotMove[] {
    const actingId = playerID ?? ctx.currentPlayer;
    const player = G.players[actingId];
    // Already chose (or unknown seat): nothing to do.
    if (!player || player.characterId) return [];

    // Seat 0 (the human in vs-Bots matches) picks FIRST — every other seat
    // holds until it has chosen. In all-bot simulations seat 0 is just the
    // first bot, so the gate still guarantees progress.
    const seatZero = G.players["0"];
    if (actingId !== "0" && seatZero && !seatZero.characterId) return [];

    const taken = new Set(
        getPlayersList(G)
            .map(p => p.characterId)
            .filter((c): c is CharacterEnum => c !== undefined)
    );

    return Object.values(CharacterEnum)
        .filter(c => !taken.has(c))
        .map(c => ({ move: "selectCharacter", args: [c] }));
}

function enumerateMainPhase(G: GameState, ctx: Ctx): BotMove[] {
    const player = G.players[ctx.currentPlayer];
    if (!player || player.hasRevealed) return [];

    const moves: BotMove[] = [];

    // placeWorker: only before a card is played. `isWorkerPlacementValid`
    // re-checks the hasPlayedCard / worker / taken / cost guards. Locations
    // needing user input get ONE synthesized moveParams choice (Stage B),
    // re-validated against the reducer's validator before being emitted.
    if (!player.hasPlayedCard && player.currentNumberOfWorkers > 0) {
        const mgState = { G, ctx } as MetaGameState; // read-only use by validators
        for (let d = 0; d < G.districts.length; d++) {
            const locations = G.districts[d].locations;
            for (let l = 0; l < locations.length; l++) {
                const location = locations[l];
                // Depends only on the location — hoisted out of the per-card
                // loop so it isn't recomputed once per hand card.
                const needsInput = locationNeedsInput(location);
                for (const card of player.hand) {
                    if (!isWorkerPlacementValid(player, location, card)) continue;

                    if (!needsInput) {
                        moves.push({ move: "placeWorker", args: [d, l, card] });
                        continue;
                    }

                    const moveParams = synthesizeMoveParams(G, player, location, card);
                    if (!moveParams) continue;
                    if (validatePlacementActions(mgState, player, location, card, moveParams) !== null) continue;
                    moves.push({ move: "placeWorker", args: [d, l, card, moveParams] });
                }
            }
        }
    }

    // draw: only before playing a card, under the heuristic cap, and only if
    // there is actually something to draw (deck or discard to rebuild from) —
    // otherwise draw is a legal no-op and the bot would loop on it forever.
    const canDraw = player.deck.length + player.discardPile.length > 0;
    if (!player.hasPlayedCard && player.hand.length < DRAW_CAP && canDraw) {
        moves.push({ move: "draw", args: [] });
    }

    // One action XOR reveal per turn:
    // pass: the only follow-up after a placement (mirrors the reducer guard).
    if (player.hasPlayedCard) {
        moves.push({ move: "pass", args: [] });
    } else {
        // reveal: only on a turn without a placement — still guarantees progress
        // (every turn starts with hasPlayedCard reset, so reveal is always
        // reachable and the phase can always end).
        moves.push({ move: "reveal", args: [] });
    }

    // Note: `selectCard` is intentionally omitted. It only sets a UI highlight;
    // `placeWorker` takes the card directly and never reads `player.selectedCard`.

    return moves;
}

/**
 * True if any of the location's cost or reward actions require user input
 * (DISCARD / TRASH / BUY_CARD → cardSelection). Such locations are excluded
 * in Stage A because a `placeWorker` without valid `moveParams.cardIds` would
 * silently claim the location for free (reducer bug, subtask 13).
 */
export function locationNeedsInput(location: Location): boolean {
    const costActions = location.cost.actions ?? [];
    const rewardActions = location.reward.actions ?? [];
    return [...costActions, ...rewardActions].some(a =>
        actionRegistry.requiresInput(a.actionId)
    );
}
