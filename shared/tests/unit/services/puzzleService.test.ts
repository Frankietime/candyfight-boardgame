import { describe, it, expect } from "vitest";
import { DEFAULT_PUZZLE_REQUIREMENT, getPuzzleProgress, isPuzzleSolved, PuzzleRequirementSpec } from "../../../services/puzzleService";
import { DistrictIconsEnum } from "../../../enums";
import { makeCard } from "../factories";

const { D1, D2, D3, D4 } = DistrictIconsEnum;

const card = (...districtIds: DistrictIconsEnum[]) => makeCard({ districtIds });

describe("isPuzzleSolved — icon-level counting (default requirement: 1 of each symbol + 2 wildcards)", () => {
    it("solves with one single-symbol card per symbol plus two wildcard cards", () => {
        const hand = [card(D1), card(D2), card(D3), card(D4), card(D1), card(D2)];
        expect(isPuzzleSolved(hand)).toBe(true);
    });

    it("fails with fewer than 2 spare icons", () => {
        const hand = [card(D1), card(D2), card(D3), card(D4), card(D1)];
        expect(isPuzzleSolved(hand)).toBe(false);
    });

    it("fails when a symbol is missing even with many icons", () => {
        const hand = [card(D1), card(D1), card(D2), card(D3), card(D1), card(D2)];
        expect(isPuzzleSolved(hand)).toBe(false); // D4 missing entirely
    });

    it("a multi-symbol card contributes BOTH its icons — one to a required symbol, the other as a wildcard", () => {
        const hand = [card(D1, D2), card(D3), card(D4), card(D1), card(D2)];
        expect(isPuzzleSolved(hand)).toBe(true);
    });

    it("a symbol-less card contributes nothing (can't serve as a wildcard)", () => {
        const hand = [card(D1), card(D2), card(D3), card(D4), card(), card()];
        expect(isPuzzleSolved(hand)).toBe(false);
    });

    it("empty or tiny hands never solve", () => {
        expect(isPuzzleSolved([])).toBe(false);
        expect(isPuzzleSolved([card(D1, D2, D3, D4)])).toBe(false);
    });

    it("solves with a single 4-symbol card plus one 2-symbol card (6 icons, all covered)", () => {
        const hand = [card(D1, D2, D3, D4), card(D1, D2)];
        expect(isPuzzleSolved(hand)).toBe(true);
    });
});

describe("getPuzzleProgress — incremental UI feedback (default requirement)", () => {
    it("reports no symbols/wildcards fulfilled for an empty selection", () => {
        const progress = getPuzzleProgress([]);
        expect(progress.symbolProgress.every(p => p.have === 0)).toBe(true);
        expect(progress.wildcardsHave).toBe(0);
        expect(progress.solved).toBe(false);
    });

    it("marks each symbol progress as covered as soon as ANY selected card carries it", () => {
        const progress = getPuzzleProgress([card(D1), card(D3, D4)]);
        const have = (s: DistrictIconsEnum) => progress.symbolProgress.find(p => p.symbol === s)!.have;
        expect(have(D1)).toBe(1);
        expect(have(D2)).toBe(0);
        expect(have(D3)).toBe(1);
        expect(have(D4)).toBe(1);
        expect(progress.wildcardsHave).toBe(0);
    });

    it("fills wildcard slots incrementally as spare icons accumulate", () => {
        const base = [card(D1), card(D2), card(D3), card(D4)]; // all covered, 0 spare
        expect(getPuzzleProgress(base).wildcardsHave).toBe(0);

        const plusOne = [...base, card(D1)]; // 1 spare icon
        expect(getPuzzleProgress(plusOne).wildcardsHave).toBe(1);

        const plusTwo = [...base, card(D1), card(D2)]; // 2 spare icons
        const progress = getPuzzleProgress(plusTwo);
        expect(progress.wildcardsHave).toBe(2);
        expect(progress.solved).toBe(true);
    });

    it("a 2-symbol card counts toward two different requirement slots at once", () => {
        const progress = getPuzzleProgress([card(D1, D2)]);
        const have = (s: DistrictIconsEnum) => progress.symbolProgress.find(p => p.symbol === s)!.have;
        expect(have(D1)).toBe(1);
        expect(have(D2)).toBe(1);
        expect(have(D3)).toBe(0);
        expect(have(D4)).toBe(0);
    });
});

describe("configurable PuzzleRequirementSpec", () => {
    it("supports a requirement with per-symbol counts greater than 1", () => {
        const requirement: PuzzleRequirementSpec = { symbolCounts: { [D1]: 2 }, wildcards: 0 };
        expect(isPuzzleSolved([card(D1)], requirement)).toBe(false);
        expect(isPuzzleSolved([card(D1), card(D1)], requirement)).toBe(true);
    });

    it("supports a wildcards-only requirement (no required symbols)", () => {
        const requirement: PuzzleRequirementSpec = { symbolCounts: {}, wildcards: 3 };
        expect(isPuzzleSolved([card(D1), card(D2)], requirement)).toBe(false);
        expect(isPuzzleSolved([card(D1), card(D2), card(D3)], requirement)).toBe(true);
    });

    it("supports a trivial always-solved requirement (0 symbols, 0 wildcards)", () => {
        const requirement: PuzzleRequirementSpec = { symbolCounts: {}, wildcards: 0 };
        expect(isPuzzleSolved([], requirement)).toBe(true);
    });

    it("extra icons of an over-supplied required symbol spill into the wildcard pool", () => {
        const requirement: PuzzleRequirementSpec = { symbolCounts: { [D1]: 1 }, wildcards: 1 };
        // 3 D1 icons: 1 satisfies the requirement, the other 2 are spare (only 1 wildcard slot needed).
        expect(isPuzzleSolved([card(D1), card(D1), card(D1)], requirement)).toBe(true);
    });

    it("DEFAULT_PUZZLE_REQUIREMENT is the classic 1-of-each + 2-wildcards shape", () => {
        expect(DEFAULT_PUZZLE_REQUIREMENT.wildcards).toBe(2);
        expect(Object.values(DEFAULT_PUZZLE_REQUIREMENT.symbolCounts)).toEqual([1, 1, 1, 1]);
    });
});
