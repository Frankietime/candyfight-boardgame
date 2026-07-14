/**
 * botObjectives unit tests — pure checkers on hand-built states (N-player).
 */
import { describe, it, expect } from "vitest";
import { objectives, scoreState } from "../ai/botObjectives";
import type { GameState } from "../types";

const ctx = { currentPlayer: "0" } as any;

/** Minimal hand-built GameState for objective checkers. */
function makeState(opts: {
    vps?: Record<string, number>;
    econ?: Record<string, { candy: number; loot: number }>;
    presence?: Record<string, Record<string, number>>; // districtIdx -> playerID -> amount
    targetVP?: number;
}): GameState {
    const ids = Object.keys(opts.vps ?? { "0": 0, "1": 0 });
    const players: any = {};
    for (const id of ids) {
        players[id] = {
            id,
            victoryPoints: opts.vps?.[id] ?? 0,
            candy: opts.econ?.[id]?.candy ?? 0,
            loot: opts.econ?.[id]?.loot ?? 0,
        };
    }
    const districts = Array.from({ length: 4 }, (_, i) => ({
        id: `D${i}`,
        presence: Object.fromEntries(
            Object.entries(opts.presence?.[i] ?? {}).map(([pid, amount]) => [
                pid,
                { playerID: pid, amount },
            ])
        ),
    }));
    return {
        players,
        districts,
        config: { victoryPoints: opts.targetVP ?? 6 },
    } as unknown as GameState;
}

const check = (G: GameState, name: string, playerID = "0") =>
    objectives(G, ctx, playerID)[name].checker(G, ctx);

describe("objectives — leadingVP", () => {
    it("true when strictly ahead of every other player", () => {
        const G = makeState({ vps: { "0": 5, "1": 3, "2": 4 } });
        expect(check(G, "leadingVP")).toBe(true);
    });
    it("false on a tie for the lead", () => {
        const G = makeState({ vps: { "0": 4, "1": 4 } });
        expect(check(G, "leadingVP")).toBe(false);
    });
});

describe("objectives — nearWin", () => {
    it("true at targetVP - 1", () => {
        const G = makeState({ vps: { "0": 5, "1": 0 }, targetVP: 6 });
        expect(check(G, "nearWin")).toBe(true);
    });
    it("false when further away", () => {
        const G = makeState({ vps: { "0": 4, "1": 0 }, targetVP: 6 });
        expect(check(G, "nearWin")).toBe(false);
    });
});

describe("objectives — boardPresence / soloDistrict", () => {
    it("boardPresence true with tokens in >= 2 districts", () => {
        const G = makeState({ presence: { 0: { "0": 1 }, 1: { "0": 2 } } });
        expect(check(G, "boardPresence")).toBe(true);
    });
    it("boardPresence false with only one district", () => {
        const G = makeState({ presence: { 0: { "0": 1 } } });
        expect(check(G, "boardPresence")).toBe(false);
    });
    it("soloDistrict true when uncontested somewhere", () => {
        const G = makeState({ presence: { 0: { "0": 1 } } });
        expect(check(G, "soloDistrict")).toBe(true);
    });
    it("soloDistrict false when every district is contested", () => {
        const G = makeState({ presence: { 0: { "0": 1, "1": 1 } } });
        expect(check(G, "soloDistrict")).toBe(false);
    });
    it("soloDistrict false on a tied district (calculateCombatWinner has no winner)", () => {
        const G = makeState({ presence: { 0: { "0": 2, "1": 2 } } });
        expect(check(G, "soloDistrict")).toBe(false);
    });
    it("soloDistrict true when I clearly outnumber a rival in a shared district (reuses calculateCombatWinner)", () => {
        const G = makeState({ presence: { 0: { "0": 2, "1": 1 } } });
        expect(check(G, "soloDistrict")).toBe(true);
        expect(check(G, "soloDistrict", "1")).toBe(false);
    });
});

describe("objectives — economy", () => {
    it("true above the table average", () => {
        const G = makeState({ econ: { "0": { candy: 8, loot: 2 }, "1": { candy: 0, loot: 0 } } });
        expect(check(G, "economy")).toBe(true);
    });
    it("false at or below the average", () => {
        const G = makeState({ econ: { "0": { candy: 1, loot: 1 }, "1": { candy: 5, loot: 5 } } });
        expect(check(G, "economy")).toBe(false);
    });
});

describe("scoreState", () => {
    it("rewards a strictly better position with a higher score", () => {
        const winning = makeState({
            vps: { "0": 5, "1": 1 },
            econ: { "0": { candy: 8, loot: 2 }, "1": { candy: 0, loot: 0 } },
            presence: { 0: { "0": 1 }, 1: { "0": 1 } },
            targetVP: 6,
        });
        const losing = makeState({
            vps: { "0": 0, "1": 5 },
            econ: { "0": { candy: 0, loot: 0 }, "1": { candy: 8, loot: 2 } },
            presence: { 0: { "1": 1 } },
            targetVP: 6,
        });
        expect(scoreState(winning, ctx, "0")).toBeGreaterThan(scoreState(losing, ctx, "0"));
    });

    it("is symmetric: the same state scores each rival by their own standing", () => {
        const G = makeState({ vps: { "0": 5, "1": 1 }, targetVP: 6 });
        expect(scoreState(G, ctx, "0")).toBeGreaterThan(scoreState(G, ctx, "1"));
    });
});
