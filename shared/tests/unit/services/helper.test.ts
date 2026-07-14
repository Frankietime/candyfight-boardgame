import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import { getCurrentPlayer, getCurrentLocation, takeFromHand } from "../../../services/moves/helper";
import {
    makeCard,
    makeCtx,
    makeDistrict,
    makeGameState,
    makeLocation,
    makeMetaState,
    makePlayer,
} from "../factories";

describe("getCurrentPlayer", () => {
    it("returns the player matching ctx.currentPlayer", () => {
        const state = makeMetaState({
            G: makeGameState({ players: { "0": makePlayer({ id: "0" }), "1": makePlayer({ id: "1" }) } }),
            ctx: makeCtx({ currentPlayer: "1" }),
        });
        expect(getCurrentPlayer(state).id).toBe("1");
    });
});

describe("getCurrentLocation", () => {
    it("indexes into districts[d].locations[l]", () => {
        const loc = makeLocation({ name: "Target" });
        const state = makeMetaState({
            G: makeGameState({ districts: [makeDistrict({ locations: [makeLocation(), loc] })] }),
        });
        expect(getCurrentLocation(state, 0, 1)!.name).toBe("Target");
    });

    it("returns undefined for an out-of-range districtID instead of throwing", () => {
        const state = makeMetaState({
            G: makeGameState({ districts: [makeDistrict({ locations: [makeLocation()] })] }),
        });
        expect(() => getCurrentLocation(state, 99, 0)).not.toThrow();
        expect(getCurrentLocation(state, 99, 0)).toBeUndefined();
    });

    it("returns undefined for an out-of-range locationID instead of throwing", () => {
        const state = makeMetaState({
            G: makeGameState({ districts: [makeDistrict({ locations: [makeLocation()] })] }),
        });
        expect(() => getCurrentLocation(state, 0, 99)).not.toThrow();
        expect(getCurrentLocation(state, 0, 99)).toBeUndefined();
    });
});

describe("takeFromHand", () => {
    it("returns an empty array for an empty selection", () => {
        const player = makePlayer({ hand: [makeCard()] });
        expect(takeFromHand(player, [])).toEqual([]);
        expect(player.hand).toHaveLength(1);
    });

    it("removes and returns the requested cards", () => {
        const a = makeCard({ id: "a" });
        const b = makeCard({ id: "b" });
        const player = makePlayer({ hand: [a, b] });
        const taken = takeFromHand(player, [a]);
        expect(taken).toEqual([a]);
        expect(player.hand).toEqual([b]);
    });

    it("returns INVALID_MOVE when a requested card is missing", () => {
        const player = makePlayer({ hand: [makeCard({ id: "a" })] });
        expect(takeFromHand(player, [makeCard({ id: "ghost" })])).toBe(INVALID_MOVE);
    });

    it("returns INVALID_MOVE when asking for more cards than are in hand", () => {
        const player = makePlayer({ hand: [makeCard({ id: "a" })] });
        expect(takeFromHand(player, [makeCard({ id: "a" }), makeCard({ id: "b" })])).toBe(INVALID_MOVE);
    });

    it("returns INVALID_MOVE for a duplicate id request instead of removing an unintended card (regression)", () => {
        // hand has one "x" and one "y"; requesting [x, x] passes the naive
        // presence check (includes(x) is true) but there is only one x to take.
        // A buggy implementation resolves the second "x" via indexOf === -1,
        // which splice(-1, 1) interprets as "remove the last card" — silently
        // deleting "y" instead of rejecting the move.
        const x = makeCard({ id: "x" });
        const y = makeCard({ id: "y" });
        const player = makePlayer({ hand: [x, y] });
        const result = takeFromHand(player, [x, x]);
        expect(result).toBe(INVALID_MOVE);
        expect(player.hand).toEqual([x, y]);
    });
});
