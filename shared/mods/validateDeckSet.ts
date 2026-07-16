import { MOD_SCHEMA_VERSION, DeckSetDefinition } from "./types";
import { isRecord, isValidName, NAME_MAX_LENGTH } from "./validateEffects";
import { validateDecksPayload } from "./validateDecks";

export type DeckSetValidationResult =
    | { ok: true; deckSet: DeckSetDefinition }
    | { ok: false; errors: string[] };

/**
 * Validate an untrusted payload as a DeckSetDefinition. Reuses the exact
 * same decks-payload rules as ModDefinition (validateDecksPayload) — a deck
 * set is held to the same standard whether it lives inside a mod or on its
 * own, so loading one into a mod can never introduce content the mod
 * validator would reject.
 */
export const validateDeckSetDefinition = (payload: unknown): DeckSetValidationResult => {
    const errors: string[] = [];

    if (!isRecord(payload)) {
        return { ok: false, errors: ["deck set payload must be an object"] };
    }

    if (payload.schemaVersion !== MOD_SCHEMA_VERSION) {
        errors.push(`schemaVersion must be ${MOD_SCHEMA_VERSION} (got ${payload.schemaVersion})`);
    }
    if (!isValidName(payload.name)) {
        errors.push(`name must be a non-empty string of at most ${NAME_MAX_LENGTH} chars`);
    }
    if (payload.description !== undefined && typeof payload.description !== "string") {
        errors.push("description must be a string");
    }

    if (!isRecord(payload.decks)) {
        errors.push("decks must be an object");
    } else {
        validateDecksPayload(payload.decks, errors);
        // A deck set with no base deck can't equip a player — require content
        // (a mod without decks is fine, since it falls back to the base
        // cartridge, but a deck set exists SPECIFICALLY to be loaded, so an
        // empty one is never useful).
        if (!Array.isArray(payload.decks.baseDeck) || payload.decks.baseDeck.length === 0) {
            errors.push("decks.baseDeck must be a non-empty array");
        }
    }

    return errors.length > 0
        ? { ok: false, errors }
        : { ok: true, deckSet: payload as unknown as DeckSetDefinition };
};
