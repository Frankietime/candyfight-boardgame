import { MOD_SCHEMA_VERSION, SignetSetDefinition } from "./types";
import { isRecord, isValidName, NAME_MAX_LENGTH } from "./validateEffects";
import { validateCharactersPayload } from "./validateCharacters";

export type SignetSetValidationResult =
    | { ok: true; signetSet: SignetSetDefinition }
    | { ok: false; errors: string[] };

/**
 * Validate an untrusted payload as a SignetSetDefinition. Reuses the exact
 * same characters-payload rules as ModDefinition (validateCharactersPayload)
 * — mirrors validateDeckSet.ts exactly.
 */
export const validateSignetSetDefinition = (payload: unknown): SignetSetValidationResult => {
    const errors: string[] = [];

    if (!isRecord(payload)) {
        return { ok: false, errors: ["signet set payload must be an object"] };
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

    if (!Array.isArray(payload.characters) || payload.characters.length === 0) {
        errors.push("characters must be a non-empty array");
    } else {
        validateCharactersPayload(payload.characters, errors);
    }

    return errors.length > 0
        ? { ok: false, errors }
        : { ok: true, signetSet: payload as unknown as SignetSetDefinition };
};
