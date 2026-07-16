import { DistrictIconsEnum, LocationActionsEnum } from "../enums";
import { DEFAULT_MARKET_TIER } from "../constants";
import { actionRegistry } from "../actions";
import { isRecord, isValidName, NAME_MAX_LENGTH, validateEffectBag } from "./validateEffects";
import { hasAnyReveal, hasPuzzleReveal } from "./revealEffects";

/**
 * `ModDecks` validation (baseDeck + marketTiers) — shared by ModDefinition
 * validation and standalone DeckSetDefinition validation, so a "deck set" is
 * held to the exact same rules whether it lives inside a mod or on its own.
 */

const EXPECTED_DISTRICT_IDS = Object.values(DistrictIconsEnum);
const COPIES_MAX = 10;
const PUZZLE_COUNT_MAX = 99;
/** Minimum total base-deck instances (Σ copies) when a baseDeck is authored. */
const BASE_DECK_MIN_INSTANCES = 4;

/** Tier ids a decks payload authors (falls back to the base default when none). */
export const collectTierIds = (decks: unknown): Set<string> => {
    const ids = new Set<string>();
    if (isRecord(decks) && Array.isArray(decks.marketTiers) && decks.marketTiers.length > 0) {
        decks.marketTiers.forEach((tier: unknown) => {
            if (isRecord(tier) && typeof tier.id === "string") ids.add(tier.id);
        });
    } else {
        // No authored tiers → the builder falls back to the base cartridge.
        ids.add(DEFAULT_MARKET_TIER);
    }
    return ids;
};

/** Validates a `ModDecks`-shaped payload (baseDeck + marketTiers), appending errors. */
export const validateDecksPayload = (decks: unknown, errs: string[]): void => {
    if (decks === undefined) return;
    if (!isRecord(decks)) {
        errs.push("decks must be an object");
        return;
    }

    const seenCardIds = new Set<string>();
    let puzzleCardCount = 0;

    if (decks.baseDeck !== undefined) {
        if (!Array.isArray(decks.baseDeck)) {
            errs.push("decks.baseDeck must be an array");
        } else {
            let totalInstances = 0;
            decks.baseDeck.forEach((card: unknown, i: number) => {
                validateModCard(card, `decks.baseDeck[${i}]`, true, seenCardIds, errs);
                if (isRecord(card)) {
                    totalInstances += Math.max(1, (card.copies as number) || 1);
                    if (hasPuzzleReveal({
                        secondaryResources: card.secondaryResources as never,
                        secondaryEffects: card.secondaryEffects as never,
                    })) {
                        puzzleCardCount += 1;
                        if (puzzleCardCount > 1) {
                            errs.push("decks.baseDeck: at most one card may carry the Puzzle reveal");
                        }
                    }
                }
            });
            if (decks.baseDeck.length > 0 && totalInstances < BASE_DECK_MIN_INSTANCES) {
                errs.push(`decks.baseDeck must total at least ${BASE_DECK_MIN_INSTANCES} card instances`);
            }
        }
    }

    if (decks.marketTiers !== undefined) {
        if (!Array.isArray(decks.marketTiers)) {
            errs.push("decks.marketTiers must be an array");
        } else {
            const seenTierIds = new Set<string>();
            decks.marketTiers.forEach((tier: unknown, t: number) => {
                const label = `decks.marketTiers[${t}]`;
                if (!isRecord(tier)) {
                    errs.push(`${label} must be an object`);
                    return;
                }
                if (typeof tier.id !== "string" || tier.id.trim().length === 0) {
                    errs.push(`${label}.id must be a non-empty string`);
                } else if (seenTierIds.has(tier.id)) {
                    errs.push(`${label}.id "${tier.id}" is duplicated`);
                } else {
                    seenTierIds.add(tier.id);
                }
                if (!isValidName(tier.name)) {
                    errs.push(`${label}.name must be a non-empty string of at most ${NAME_MAX_LENGTH} chars`);
                }
                if (!Array.isArray(tier.cards) || tier.cards.length === 0) {
                    errs.push(`${label}.cards must be a non-empty array`);
                    return;
                }
                tier.cards.forEach((card: unknown, i: number) => {
                    validateModCard(card, `${label}.cards[${i}]`, false, seenCardIds, errs);
                });
            });
        }
    }
};

/** Validates a single ModCard (both baseDeck and market-tier cards). */
const validateModCard = (
    card: unknown,
    label: string,
    allowReveal: boolean,
    seenIds: Set<string>,
    errs: string[]
): void => {
    if (!isRecord(card)) {
        errs.push(`${label} must be an object`);
        return;
    }
    if (typeof card.id !== "string" || card.id.trim().length === 0) {
        errs.push(`${label}.id must be a non-empty string`);
    } else if (seenIds.has(card.id)) {
        errs.push(`${label}.id "${card.id}" is duplicated (card ids must be unique across all decks)`);
    } else {
        seenIds.add(card.id);
    }
    if (!isValidName(card.name)) {
        errs.push(`${label}.name must be a non-empty string of at most ${NAME_MAX_LENGTH} chars`);
    }
    if (!Array.isArray(card.districtIds)) {
        errs.push(`${label}.districtIds must be an array`);
    } else {
        const seen = new Set<string>();
        card.districtIds.forEach((id: unknown, k: number) => {
            if (typeof id !== "string" || !EXPECTED_DISTRICT_IDS.includes(id as DistrictIconsEnum)) {
                errs.push(`${label}.districtIds[${k}] must be one of: ${EXPECTED_DISTRICT_IDS.join(", ")}`);
            } else if (seen.has(id)) {
                errs.push(`${label}.districtIds[${k}] "${id}" is duplicated`);
            } else {
                seen.add(id);
            }
        });
    }
    if (card.copies !== undefined &&
        (typeof card.copies !== "number" || !Number.isInteger(card.copies) || card.copies < 1 || card.copies > COPIES_MAX)) {
        errs.push(`${label}.copies must be an integer between 1 and ${COPIES_MAX}`);
    }

    // Play (primary) payload: reward-shaped, and every action must be
    // input-free — playCard executes them blindly, an input-requiring
    // action would silently no-op.
    validateEffectBag(
        { resources: card.primaryResources, actions: card.primaryEffects },
        `${label}(play)`,
        false,
        errs
    );
    (Array.isArray(card.primaryEffects) ? card.primaryEffects : []).forEach((action: unknown, k: number) => {
        if (isRecord(action) && typeof action.actionId === "string" && actionRegistry.requiresInput(action.actionId)) {
            errs.push(`${label}(play).actions[${k}]: card effects must not require user input`);
        }
    });

    // Reveal (secondary) payload: free-form, same rules as Play — every
    // action must be input-free (fired automatically at reveal time).
    const secondaryHasContent = hasAnyReveal({
        secondaryResources: card.secondaryResources as never,
        secondaryEffects: card.secondaryEffects as never,
    });
    if (!allowReveal && secondaryHasContent) {
        errs.push(`${label}: market cards cannot carry reveal effects`);
        return;
    }
    if (!secondaryHasContent) return;

    validateEffectBag(
        { resources: card.secondaryResources, actions: card.secondaryEffects },
        `${label}(reveal)`,
        false,
        errs
    );
    const secondaryEffects = Array.isArray(card.secondaryEffects) ? card.secondaryEffects : [];
    let puzzleActionsOnThisCard = 0;
    secondaryEffects.forEach((action: unknown, k: number) => {
        if (!isRecord(action) || typeof action.actionId !== "string") return;
        if (actionRegistry.requiresInput(action.actionId)) {
            errs.push(`${label}(reveal).actions[${k}]: reveal effects must not require user input`);
        }
        if (action.actionId === LocationActionsEnum.STRANGE_CANDY_PUZZLE) {
            puzzleActionsOnThisCard += 1;
            validatePuzzleParams(action.params, `${label}(reveal).actions[${k}]`, errs);
        }
    });
    if (puzzleActionsOnThisCard > 1) {
        errs.push(`${label}: a card may carry at most one Puzzle reveal`);
    }
};

const validatePuzzleParams = (params: unknown, label: string, errs: string[]): void => {
    if (params === undefined) return; // falls back to the default requirement
    if (!isRecord(params)) {
        errs.push(`${label}.params must be an object`);
        return;
    }
    if (params.symbolCounts !== undefined) {
        if (!isRecord(params.symbolCounts)) {
            errs.push(`${label}.params.symbolCounts must be an object`);
        } else {
            Object.entries(params.symbolCounts).forEach(([symbol, count]) => {
                if (!EXPECTED_DISTRICT_IDS.includes(symbol as DistrictIconsEnum)) {
                    errs.push(`${label}.params.symbolCounts key "${symbol}" is not a valid district symbol`);
                } else if (typeof count !== "number" || !Number.isInteger(count) || count < 0 || count > PUZZLE_COUNT_MAX) {
                    errs.push(`${label}.params.symbolCounts["${symbol}"] must be an integer between 0 and ${PUZZLE_COUNT_MAX}`);
                }
            });
        }
    }
    if (params.wildcards !== undefined &&
        (typeof params.wildcards !== "number" || !Number.isInteger(params.wildcards) || params.wildcards < 0 || params.wildcards > PUZZLE_COUNT_MAX)) {
        errs.push(`${label}.params.wildcards must be an integer between 0 and ${PUZZLE_COUNT_MAX}`);
    }
};
