import { DistrictIconsEnum } from "../enums";
import { Card } from "../types";

/**
 * The Puzzle challenge (enabled by playing a Puzzle-reveal card):
 * among the REVEALED HAND cards only — the enabling card sits in cardsInPlay,
 * never in the hand, so it can't count toward its own challenge — the player
 * must assemble:
 *   · one card for EACH of the 4 district symbols (a multi-symbol card may
 *     fill exactly ONE of its symbols), plus
 *   · two additional cards bearing at least one symbol (the "? ?" wildcards).
 * Solving it is worth +1 VP (handled by the STRANGE_CANDY_PUZZLE action).
 */
export const PUZZLE_WILDCARDS = 2;

export const isPuzzleSolved = (hand: Card[]): boolean => {
    const symbols = Object.values(DistrictIconsEnum);

    // Try to assign a distinct hand card to every symbol (backtracking —
    // hands are tiny), then check enough symbol-bearing cards remain for
    // the wildcards.
    const used = new Array<boolean>(hand.length).fill(false);

    const assign = (symbolIndex: number): boolean => {
        if (symbolIndex === symbols.length) {
            const spares = hand.filter(
                (card, i) => !used[i] && (card.districtIds?.length ?? 0) > 0
            ).length;
            return spares >= PUZZLE_WILDCARDS;
        }
        const symbol = symbols[symbolIndex];
        for (let i = 0; i < hand.length; i++) {
            if (used[i] || !hand[i].districtIds?.includes(symbol)) continue;
            used[i] = true;
            if (assign(symbolIndex + 1)) return true;
            used[i] = false;
        }
        return false;
    };

    return assign(0);
};
