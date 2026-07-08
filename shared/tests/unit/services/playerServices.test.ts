import { describe, it, expect, vi, afterEach } from "vitest";
import { getPlayersList, getRandomPlayerName } from "../../../services/moves/playerServices";
import { makeGameState, makePlayer } from "../factories";

afterEach(() => vi.restoreAllMocks());

describe("getPlayersList", () => {
    it("returns the player objects as an array", () => {
        const G = makeGameState({
            players: { "0": makePlayer({ id: "0" }), "1": makePlayer({ id: "1" }) },
        });
        const list = getPlayersList(G);
        expect(list.map(p => p.id)).toEqual(["0", "1"]);
    });

    it("returns an empty array when there are no players", () => {
        expect(getPlayersList(makeGameState({ players: {} }))).toEqual([]);
    });
});

describe("getRandomPlayerName", () => {
    it("builds a two-word person name when the 'person' mode is selected", () => {
        // Math.random sequence: first call selects mode index, rest pick parts.
        vi.spyOn(Math, "random").mockReturnValue(0.4); // 0.4 * 3 = 1.2 → index 1 → "person"
        const name = getRandomPlayerName();
        expect(name.split(" ")).toHaveLength(2);
    });

    it("builds a corporation name with a suffix when 'corporation' mode is selected", () => {
        vi.spyOn(Math, "random").mockReturnValue(0.7); // 0.7 * 3 = 2.1 → index 2 → "corporation"
        const name = getRandomPlayerName();
        expect(name.split(" ")).toHaveLength(2);
    });

    it("builds a single-token entity name when 'entity' mode is selected", () => {
        vi.spyOn(Math, "random").mockReturnValue(0); // index 0 → "entity"
        const name = getRandomPlayerName();
        expect(name).toMatch(/^\S+$/);
    });
});
