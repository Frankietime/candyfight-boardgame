import { actionRegistry } from "../actions";
import { isRecord, isValidName, NAME_MAX_LENGTH, validateEffectBag } from "./validateEffects";

/**
 * `ModCharacter[]` validation — shared by ModDefinition and standalone
 * SignetSetDefinition validation, so a "signet set" is held to the exact same
 * rules whether it lives inside a mod or on its own (mirrors validateDecks.ts).
 */

/** Validates a `ModCharacter[]` payload, appending errors. */
export const validateCharactersPayload = (characters: unknown, errs: string[]): void => {
    if (characters === undefined) return;
    if (!Array.isArray(characters)) {
        errs.push("characters must be an array");
        return;
    }
    const seenIds = new Set<string>();
    characters.forEach((character: unknown, i: number) => {
        validateModCharacter(character, `characters[${i}]`, seenIds, errs);
    });
};

const validateModCharacter = (
    character: unknown,
    label: string,
    seenIds: Set<string>,
    errs: string[]
): void => {
    if (!isRecord(character)) {
        errs.push(`${label} must be an object`);
        return;
    }
    if (typeof character.id !== "string" || character.id.trim().length === 0) {
        errs.push(`${label}.id must be a non-empty string`);
    } else if (seenIds.has(character.id)) {
        errs.push(`${label}.id "${character.id}" is duplicated`);
    } else {
        seenIds.add(character.id);
    }
    if (!isValidName(character.name)) {
        errs.push(`${label}.name must be a non-empty string of at most ${NAME_MAX_LENGTH} chars`);
    }
    if (character.description !== undefined && typeof character.description !== "string") {
        errs.push(`${label}.description must be a string`);
    }
    if (typeof character.emoji !== "string" || character.emoji.trim().length === 0) {
        errs.push(`${label}.emoji must be a non-empty string`);
    }
    if (typeof character.color !== "string" || character.color.trim().length === 0) {
        errs.push(`${label}.color must be a non-empty string`);
    }

    // Signet payload: input-free, same rule as a card's primaryEffects — the
    // Signet card executes it blindly, an input-requiring action would
    // silently no-op.
    validateEffectBag(character.signet, `${label}.signet`, false, errs);
    const signetActions = isRecord(character.signet) && Array.isArray(character.signet.actions)
        ? character.signet.actions
        : [];
    signetActions.forEach((action: unknown, k: number) => {
        if (isRecord(action) && typeof action.actionId === "string" && actionRegistry.requiresInput(action.actionId)) {
            errs.push(`${label}.signet.actions[${k}]: signet effects must not require user input`);
        }
    });
};
