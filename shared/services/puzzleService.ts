import { DistrictIconsEnum } from "../enums";
import { Card } from "../types";

/**
 * The Puzzle challenge (enabled by playing a Puzzle-reveal card): count is
 * done at the ICON level, not the card level. Every district symbol printed
 * on a selected card contributes one icon to a shared pool — a 2-symbol card
 * contributes 2 icons at once, each usable independently.
 *
 * The requirement (how many icons of each symbol, plus how many "any symbol"
 * wildcards) is mod-author configurable per Puzzle card — see
 * `PuzzleRequirementSpec`. `DEFAULT_PUZZLE_REQUIREMENT` is the classic shape
 * (1 of each of the 4 district symbols + 2 wildcards).
 *
 * The enabling Puzzle card is never itself in the counted hand (callers pass
 * only the OTHER revealed-hand cards) — its own symbols never count.
 */
export interface PuzzleRequirementSpec {
    /** How many icons of each district symbol are required (0/absent = none needed). */
    symbolCounts: Partial<Record<DistrictIconsEnum, number>>;
    /** Extra "any symbol" wildcard icons required beyond symbolCounts. */
    wildcards: number;
}

export const DEFAULT_PUZZLE_REQUIREMENT: PuzzleRequirementSpec = {
    symbolCounts: Object.fromEntries(
        Object.values(DistrictIconsEnum).map(s => [s, 1])
    ) as Record<DistrictIconsEnum, number>,
    wildcards: 2,
};

export interface PuzzleProgress {
    /** Per required symbol: how many are needed vs. currently covered. */
    symbolProgress: { symbol: DistrictIconsEnum; needed: number; have: number }[];
    wildcardsNeeded: number;
    wildcardsHave: number;
    solved: boolean;
}

/** Icon-level progress toward solving the puzzle for a given card selection. */
export const getPuzzleProgress = (
    hand: Card[],
    requirement: PuzzleRequirementSpec = DEFAULT_PUZZLE_REQUIREMENT
): PuzzleProgress => {
    const counts: Partial<Record<DistrictIconsEnum, number>> = {};
    let totalIcons = 0;
    for (const card of hand) {
        for (const id of card.districtIds ?? []) {
            const symbol = id as DistrictIconsEnum;
            counts[symbol] = (counts[symbol] ?? 0) + 1;
            totalIcons++;
        }
    }

    const symbolProgress = (Object.entries(requirement.symbolCounts) as [DistrictIconsEnum, number][])
        .filter(([, needed]) => (needed ?? 0) > 0)
        .map(([symbol, needed]) => ({ symbol, needed, have: Math.min(needed, counts[symbol] ?? 0) }));

    // Icons left over after reserving one per already-covered symbol slot —
    // these are what's available for the wildcard slots (any symbol, any card).
    const iconsUsedForSymbols = symbolProgress.reduce((sum, p) => sum + p.have, 0);
    const spareIcons = Math.max(0, totalIcons - iconsUsedForSymbols);
    const wildcardsHave = Math.min(requirement.wildcards, spareIcons);
    const allSymbolsMet = symbolProgress.every(p => p.have >= p.needed);

    return {
        symbolProgress,
        wildcardsNeeded: requirement.wildcards,
        wildcardsHave,
        solved: allSymbolsMet && wildcardsHave >= requirement.wildcards,
    };
};

export const isPuzzleSolved = (hand: Card[], requirement?: PuzzleRequirementSpec): boolean =>
    getPuzzleProgress(hand, requirement).solved;
