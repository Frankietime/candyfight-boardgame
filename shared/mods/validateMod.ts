import { DistrictIconsEnum } from "../enums";
import { MOD_SCHEMA_VERSION, ModDefinition } from "./types";
import { isRecord, isValidAmount, isValidName, NAME_MAX_LENGTH, validateEffectBag } from "./validateEffects";
import { collectTierIds, validateDecksPayload } from "./validateDecks";
import { validateCharactersPayload } from "./validateCharacters";

export type ModValidationResult =
    | { ok: true; mod: ModDefinition }
    | { ok: false; errors: string[] };

const AMOUNT_MAX = 99;
const EXPECTED_DISTRICT_IDS = Object.values(DistrictIconsEnum);
const LOCATIONS_PER_DISTRICT = 4;

/**
 * Validate an untrusted payload as a ModDefinition.
 * Hand-rolled on purpose (no zod in shared/ — same convention as i18n):
 * the schema is small and fixed, and shared/ stays dependency-free.
 */
export const validateModDefinition = (payload: unknown): ModValidationResult => {
    const errors: string[] = [];

    if (!isRecord(payload)) {
        return { ok: false, errors: ["mod payload must be an object"] };
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

    // Tier ids first: locations may reference them via marketTierId.
    const tierIds = collectTierIds(payload.decks);

    validateGameConfig(payload.gameConfig, errors);
    validateDistricts(payload.districts, errors, tierIds);
    validateDecksPayload(payload.decks, errors);
    validateCharactersPayload(payload.characters, errors);

    return errors.length > 0
        ? { ok: false, errors }
        : { ok: true, mod: payload as unknown as ModDefinition };
};

function validateGameConfig(gameConfig: unknown, errs: string[]): void {
    if (gameConfig === undefined) return;
    if (!isRecord(gameConfig)) {
        errs.push("gameConfig must be an object");
        return;
    }
    for (const key of ["initialCandy", "initialLoot", "victoryPoints"]) {
        const value = gameConfig[key];
        if (value !== undefined && !isValidAmount(value)) {
            errs.push(`gameConfig.${key} must be an integer between 0 and ${AMOUNT_MAX}`);
        }
    }
    if (gameConfig.victoryPoints !== undefined && (gameConfig.victoryPoints as number) < 1) {
        errs.push("gameConfig.victoryPoints must be at least 1");
    }
}

function validateDistricts(districts: unknown, errs: string[], tierIds: Set<string>): void {
    if (!Array.isArray(districts) || districts.length !== EXPECTED_DISTRICT_IDS.length) {
        errs.push(`districts must be an array of exactly ${EXPECTED_DISTRICT_IDS.length}`);
        return;
    }
    districts.forEach((district, i) => {
        const label = `districts[${i}]`;
        if (!isRecord(district)) {
            errs.push(`${label} must be an object`);
            return;
        }
        // Fixed layout: ids LOC1..LOC4, in order.
        if (district.id !== EXPECTED_DISTRICT_IDS[i]) {
            errs.push(`${label}.id must be ${EXPECTED_DISTRICT_IDS[i]} (got ${district.id})`);
        }
        if (!isValidName(district.name)) {
            errs.push(`${label}.name must be a non-empty string of at most ${NAME_MAX_LENGTH} chars`);
        }
        if (!Array.isArray(district.locations) || district.locations.length !== LOCATIONS_PER_DISTRICT) {
            errs.push(`${label}.locations must be an array of exactly ${LOCATIONS_PER_DISTRICT}`);
            return;
        }
        district.locations.forEach((loc: unknown, j: number) =>
            validateLocation(loc, `${label}.locations[${j}]`, errs, tierIds));
    });
}

function validateLocation(loc: unknown, label: string, errs: string[], tierIds: Set<string>): void {
    if (!isRecord(loc)) {
        errs.push(`${label} must be an object`);
        return;
    }
    if (!isValidName(loc.name)) {
        errs.push(`${label}.name must be a non-empty string of at most ${NAME_MAX_LENGTH} chars`);
    }
    if (loc.isRestrictedArea !== undefined && typeof loc.isRestrictedArea !== "boolean") {
        errs.push(`${label}.isRestrictedArea must be a boolean`);
    }
    if (loc.isDisabled !== undefined && typeof loc.isDisabled !== "boolean") {
        errs.push(`${label}.isDisabled must be a boolean`);
    }
    // A marketTierId must point at an authored tier. (BUY_CARD locations
    // WITHOUT one are tolerated — the builder falls back to the round-robin
    // default, keeping phase-1 payloads valid.)
    if (loc.marketTierId !== undefined) {
        if (typeof loc.marketTierId !== "string" || !tierIds.has(loc.marketTierId)) {
            errs.push(`${label}.marketTierId must reference an existing market tier`);
        }
    }
    validateEffectBag(loc.cost, `${label}.cost`, true, errs);
    validateEffectBag(loc.reward, `${label}.reward`, false, errs);
}
