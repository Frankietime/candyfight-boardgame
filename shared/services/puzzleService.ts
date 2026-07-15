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

export const isPuzzleSolved = (hand: Card[]): boolean => findPuzzleSolution(hand) !== null;

/**
 * A concrete solving set — 4 cards assigned to the 4 symbols + 2 wildcard
 * symbol cards — or null when the hand can't solve the puzzle. Used by the
 * engine's auto-attempt (bots) and to validate a player's explicit selection.
 */
export const findPuzzleSolution = (hand: Card[]): Card[] | null => {
    const symbols = Object.values(DistrictIconsEnum);

    // Try to assign a distinct hand card to every symbol (backtracking —
    // hands are tiny), then take enough symbol-bearing spares as wildcards.
    const used = new Array<boolean>(hand.length).fill(false);

    const assign = (symbolIndex: number): Card[] | null => {
        if (symbolIndex === symbols.length) {
            const spares = hand.filter(
                (card, i) => !used[i] && (card.districtIds?.length ?? 0) > 0
            );
            if (spares.length < PUZZLE_WILDCARDS) return null;
            return [
                ...hand.filter((_, i) => used[i]),
                ...spares.slice(0, PUZZLE_WILDCARDS),
            ];
        }
        const symbol = symbols[symbolIndex];
        for (let i = 0; i < hand.length; i++) {
            if (used[i] || !hand[i].districtIds?.includes(symbol)) continue;
            used[i] = true;
            const solution = assign(symbolIndex + 1);
            if (solution) return solution;
            used[i] = false;
        }
        return null;
    };

    return assign(0);
};
