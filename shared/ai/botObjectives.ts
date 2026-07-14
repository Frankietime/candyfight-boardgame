/**
 * botObjectives — heuristic evaluation of a game state from one player's view.
 *
 * Two consumers share this single source of truth:
 *  - `objectives(G, ctx, playerID)` returns the `{ name: { checker, weight } }`
 *    record that boardgame.io's `MCTSBot` consumes (optional upgrade path).
 *  - `scoreState(G, ctx, playerID)` sums the weights of the satisfied checkers;
 *    the greedy bot uses it to rank the states that candidate moves lead to.
 *
 * All checkers are pure, read-only over `GameState`, and N-player safe.
 */
import { Ctx } from "boardgame.io";
import { GameState } from "../types";
import { getPlayersList } from "../services/moves/playerServices";
import { calculateCombatWinner } from "../game-helper";

export type Objective = {
    checker: (G: GameState, ctx: Ctx) => boolean;
    weight: number;
};

const presenceAmount = (G: GameState, districtIdx: number, playerID: string): number =>
    G.districts[districtIdx]?.presence?.[playerID]?.amount ?? 0;

/** Districts where `playerID` has at least one presence token. */
const districtsWithPresence = (G: GameState, playerID: string): number =>
    G.districts.filter((_, i) => presenceAmount(G, i, playerID) > 0).length;

/**
 * Districts where `playerID` is the ONLY player present (would win combat).
 * Reuses `calculateCombatWinner` (the same function combat resolution uses)
 * instead of re-deriving "uncontested" from presence — a district only
 * counts as solo when `playerID` both has presence AND is the winner (a
 * single-player-present district always satisfies both).
 */
const soloDistricts = (G: GameState, playerID: string): number =>
    G.districts.filter(d =>
        (d.presence?.[playerID]?.amount ?? 0) > 0 &&
        calculateCombatWinner(d) === playerID
    ).length;

export function objectives(G: GameState, ctx: Ctx, playerID?: string): Record<string, Objective> {
    const me = playerID ?? ctx.currentPlayer;
    const players = getPlayersList(G);
    const myVP = G.players[me]?.victoryPoints ?? 0;
    const targetVP = G.config?.victoryPoints ?? Infinity;

    const myEconomy = (G.players[me]?.candy ?? 0) + (G.players[me]?.loot ?? 0);
    const avgEconomy =
        players.reduce((sum, p) => sum + p.candy + p.loot, 0) / Math.max(players.length, 1);

    return {
        // Strictly leading on victory points.
        leadingVP: {
            checker: () => players.every(p => p.id === me || p.victoryPoints < myVP),
            weight: 3,
        },
        // One point from winning.
        nearWin: {
            checker: () => myVP >= targetVP - 1,
            weight: 5,
        },
        // Spread across the board (>= 2 districts).
        boardPresence: {
            checker: () => districtsWithPresence(G, me) >= 2,
            weight: 2,
        },
        // Uncontested in at least one district (free combat VP).
        soloDistrict: {
            checker: () => soloDistricts(G, me) >= 1,
            weight: 4,
        },
        // Resources above the table average.
        economy: {
            checker: () => myEconomy > avgEconomy,
            weight: 1,
        },
    };
}

/**
 * Weighted heuristic score of `G` from `playerID`'s perspective: the sum of the
 * weights of every satisfied objective. Higher is better. Used by the greedy
 * bot to compare the states that candidate moves produce.
 */
export function scoreState(G: GameState, ctx: Ctx, playerID?: string): number {
    const objs = objectives(G, ctx, playerID);
    let score = 0;
    for (const name of Object.keys(objs)) {
        const { checker, weight } = objs[name];
        if (checker(G, ctx)) score += weight;
    }
    return score;
}
