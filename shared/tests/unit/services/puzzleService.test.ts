import { describe, it, expect } from "vitest";
import { isPuzzleSolved } from "../../../services/puzzleService";
import { DistrictIconsEnum } from "../../../enums";
import { makeCard } from "../factories";

const { D1, D2, D3, D4 } = DistrictIconsEnum;

const card = (...districtIds: DistrictIconsEnum[]) => makeCard({ districtIds });

describe("isPuzzleSolved", () => {
    it("solves with one card per symbol plus two wildcard symbol cards", () => {
        const hand = [card(D1), card(D2), card(D3), card(D4), card(D1), card(D2)];
        expect(isPuzzleSolved(hand)).toBe(true);
    });

    it("fails with fewer than 2 wildcards left over", () => {
        const hand = [card(D1), card(D2), card(D3), card(D4), card(D1)];
        expect(isPuzzleSolved(hand)).toBe(false);
    });

    it("fails when a symbol is missing even with many cards", () => {
        const hand = [card(D1), card(D1), card(D2), card(D3), card(D1), card(D2)];
        expect(isPuzzleSolved(hand)).toBe(false);
    });

    it("a multi-symbol card fills exactly ONE symbol", () => {
        // D1+D2 card cannot cover both symbols at once: only 5 cards to fill
        // 4 symbols + 2 wildcards.
        const hand = [card(D1, D2), card(D3), card(D4), card(D1), card(D2)];
        expect(isPuzzleSolved(hand)).toBe(false);

        // But it can choose WHICH of its symbols to fill when that unlocks a
        // solution: it must take D2 here (D1 is covered by a single).
        const solvable = [card(D1, D2), card(D1), card(D3), card(D4), card(D3), card(D4)];
        expect(isPuzzleSolved(solvable)).toBe(true);
    });

    it("wildcards must bear at least one symbol", () => {
        const hand = [card(D1), card(D2), card(D3), card(D4), card(), card()];
        expect(isPuzzleSolved(hand)).toBe(false);
    });

    it("empty or tiny hands never solve", () => {
        expect(isPuzzleSolved([])).toBe(false);
        expect(isPuzzleSolved([card(D1, D2, D3, D4)])).toBe(false);
    });
});
