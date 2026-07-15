import { LocationActionsEnum, ResourceEnum } from "../enums";
import { ModCard } from "./types";

/**
 * Curated reveal (secondary) effects — the ONLY reveal options cards may
 * carry for now. Single source of truth for the base mod content, the mod
 * validator and the Mod Lab card editor:
 *
 * - fight  → +1 presence in the district where the card was played
 * - candy  → +1 candy
 * - puzzle → the played card enables the Puzzle challenge: at reveal, the
 *            REVEALED HAND must hold one card for each of the 4 district
 *            symbols plus 2 more symbol cards ("? ?" wildcards) → +1 VP
 *
 * The schema stays generic (secondaryResources/secondaryEffects) so this
 * catalog can grow later without a migration.
 */
export type RevealEffectId = "fight" | "candy" | "puzzle";

export const REVEAL_EFFECT_IDS: readonly RevealEffectId[] = ["fight", "candy", "puzzle"];

export type RevealSecondary = Pick<ModCard, "secondaryResources" | "secondaryEffects">;

/** Canonical serialized shape for each curated reveal (or none). */
export const buildRevealSecondary = (id: RevealEffectId | "none"): RevealSecondary => {
    switch (id) {
        case "fight":
            return {
                secondaryEffects: [
                    { actionId: LocationActionsEnum.ADD_PRESENCE_TOKEN, name: "+1 Fight" },
                ],
            };
        case "candy":
            return {
                secondaryResources: [{ resourceId: ResourceEnum.Candy, amount: 1 }],
            };
        case "puzzle":
            return {
                secondaryEffects: [
                    { actionId: LocationActionsEnum.STRANGE_CANDY_PUZZLE, name: "Puzzle" },
                ],
            };
        case "none":
            return {};
    }
};

/**
 * Classify a card's secondary payload against the curated catalog.
 * Matches on actionIds/resource bags (never on `name`, which is display text).
 * 'invalid' = any secondary content outside the catalog.
 */
export const revealEffectOf = (card: RevealSecondary): RevealEffectId | "none" | "invalid" => {
    const resources = card.secondaryResources ?? [];
    const effects = card.secondaryEffects ?? [];

    if (resources.length === 0 && effects.length === 0) return "none";

    if (
        resources.length === 1 &&
        resources[0].resourceId === ResourceEnum.Candy &&
        resources[0].amount === 1 &&
        effects.length === 0
    ) {
        return "candy";
    }

    if (resources.length === 0 && effects.length === 1) {
        if (effects[0].actionId === LocationActionsEnum.ADD_PRESENCE_TOKEN) return "fight";
        if (effects[0].actionId === LocationActionsEnum.STRANGE_CANDY_PUZZLE) return "puzzle";
    }

    return "invalid";
};
