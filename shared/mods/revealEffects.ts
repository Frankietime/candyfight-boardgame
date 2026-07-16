import { LocationActionsEnum } from "../enums";
import { ModCard } from "./types";
import { DEFAULT_PUZZLE_REQUIREMENT, PuzzleRequirementSpec } from "../services/puzzleService";

/**
 * Reveal (secondary) effects — fired from the player's REVEALED HAND.
 * A card's reveal is a free-form bag of resources/actions (same shape and
 * same authoring freedom as its Play/primary effects), with one special
 * case: a card may additionally carry the Puzzle challenge, whose required
 * icon combination (symbols + wildcards) is author-configurable and stored
 * as that action's `params`.
 */
export type RevealSecondary = Pick<ModCard, "secondaryResources" | "secondaryEffects">;

/** Whether a card's reveal payload includes a "Fight!" (ADD_PRESENCE_TOKEN) action. */
export const hasFightReveal = (card: RevealSecondary): boolean =>
    !!card.secondaryEffects?.some(e => e.actionId === LocationActionsEnum.ADD_PRESENCE_TOKEN);

/** Whether a card's reveal payload includes the Puzzle challenge. */
export const hasPuzzleReveal = (card: RevealSecondary): boolean =>
    !!card.secondaryEffects?.some(e => e.actionId === LocationActionsEnum.STRANGE_CANDY_PUZZLE);

/** Whether a card carries ANY reveal payload at all (resources or effects). */
export const hasAnyReveal = (card: RevealSecondary): boolean =>
    (card.secondaryResources?.length ?? 0) > 0 || (card.secondaryEffects?.length ?? 0) > 0;

/** The configured icon/wildcard requirement for a card's Puzzle reveal (if any). */
export const getPuzzleRequirement = (card: RevealSecondary): PuzzleRequirementSpec | undefined => {
    const puzzleAction = card.secondaryEffects?.find(e => e.actionId === LocationActionsEnum.STRANGE_CANDY_PUZZLE);
    if (!puzzleAction) return undefined;
    return (puzzleAction.params as PuzzleRequirementSpec | undefined) ?? DEFAULT_PUZZLE_REQUIREMENT;
};
