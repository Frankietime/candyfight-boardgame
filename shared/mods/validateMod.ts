import { DistrictIconsEnum, RequirementType, ResourceEnum } from "../enums";
import { DEFAULT_MARKET_TIER } from "../constants";
import { actionRegistry } from "../actions";
import { MOD_SCHEMA_VERSION, ModDefinition } from "./types";
import { revealEffectOf, RevealEffectId } from "./revealEffects";

export type ModValidationResult =
    | { ok: true; mod: ModDefinition }
    | { ok: false; errors: string[] };

const NAME_MAX_LENGTH = 40;
const AMOUNT_MAX = 99;
const EXPECTED_DISTRICT_IDS = Object.values(DistrictIconsEnum);
const LOCATIONS_PER_DISTRICT = 4;
const COPIES_MAX = 10;
/** Minimum total base-deck instances (Σ copies) when a baseDeck is authored. */
const BASE_DECK_MIN_INSTANCES = 4;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const isValidName = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0 && value.length <= NAME_MAX_LENGTH;

const isValidAmount = (value: unknown): value is number =>
    typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= AMOUNT_MAX;

/**
 * Validate an untrusted payload as a ModDefinition.
 * Hand-rolled on purpose (no zod in shared/ — same convention as i18n):
 * the schema is small and fixed, and shared/ stays dependency-free.
 */
export const validateModDefinition = (payload: unknown): ModValidationResult => {
    const errors: string[] = [];
    const knownActionIds = new Set<string>(actionRegistry.getAllActionIds());
    const knownResourceIds = new Set<string>(Object.values(ResourceEnum));
    const knownRequirementTypes = new Set<string>(Object.values(RequirementType));

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
    validateDistricts(payload.districts, errors);
    validateDecks(payload.decks, errors);

    // Phase-3 payloads: accepted but only shape-checked shallowly.
    if (payload.signets !== undefined && !Array.isArray(payload.signets)) {
        errors.push("signets must be an array");
    }

    return errors.length > 0
        ? { ok: false, errors }
        : { ok: true, mod: payload as unknown as ModDefinition };

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

    function validateDistricts(districts: unknown, errs: string[]): void {
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
                validateLocation(loc, `${label}.locations[${j}]`, errs));
        });
    }

    function validateLocation(loc: unknown, label: string, errs: string[]): void {
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
        // WITHOUT one are tolerated — the builder falls back to the default
        // tier, keeping phase-1 payloads valid.)
        if (loc.marketTierId !== undefined) {
            if (typeof loc.marketTierId !== "string" || !tierIds.has(loc.marketTierId)) {
                errs.push(`${label}.marketTierId must reference an existing market tier`);
            }
        }
        validateEffectBag(loc.cost, `${label}.cost`, true, errs);
        validateEffectBag(loc.reward, `${label}.reward`, false, errs);
    }

    function validateEffectBag(bag: unknown, label: string, isCost: boolean, errs: string[]): void {
        if (!isRecord(bag)) {
            errs.push(`${label} must be an object`);
            return;
        }
        if (bag.resources !== undefined) {
            if (!Array.isArray(bag.resources)) {
                errs.push(`${label}.resources must be an array`);
            } else {
                bag.resources.forEach((res: unknown, k: number) => {
                    if (!isRecord(res) || !knownResourceIds.has(res.resourceId as string)) {
                        errs.push(`${label}.resources[${k}].resourceId must be one of: ${[...knownResourceIds].join(", ")}`);
                        return;
                    }
                    if (!isValidAmount(res.amount)) {
                        errs.push(`${label}.resources[${k}].amount must be an integer between 0 and ${AMOUNT_MAX}`);
                    }
                });
            }
        }
        if (bag.actions !== undefined) {
            if (!Array.isArray(bag.actions)) {
                errs.push(`${label}.actions must be an array`);
            } else {
                bag.actions.forEach((action: unknown, k: number) => {
                    const actionLabel = `${label}.actions[${k}]`;
                    if (!isRecord(action) || !knownActionIds.has(action.actionId as string)) {
                        errs.push(`${actionLabel}.actionId must be a registered action`);
                        return;
                    }
                    if (typeof action.name !== "string" || action.name.length === 0) {
                        errs.push(`${actionLabel}.name must be a non-empty string`);
                    }
                    if (isCost) {
                        if (!Array.isArray(action.requirements)) {
                            errs.push(`${actionLabel}.requirements must be an array (cost actions)`);
                        } else {
                            action.requirements.forEach((req: unknown, r: number) => {
                                if (!isRecord(req) || !knownRequirementTypes.has(req.type as string)) {
                                    errs.push(`${actionLabel}.requirements[${r}].type must be one of: ${[...knownRequirementTypes].join(", ")}`);
                                }
                            });
                        }
                    }
                });
            }
        }
    }

    // ------------------------------------------------------------------
    // Decks (phase 2)
    // ------------------------------------------------------------------

    function collectTierIds(decks: unknown): Set<string> {
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
    }

    function validateDecks(decks: unknown, errs: string[]): void {
        if (decks === undefined) return;
        if (!isRecord(decks)) {
            errs.push("decks must be an object");
            return;
        }

        const seenCardIds = new Set<string>();
        const revealCounts: Record<RevealEffectId, number> = { fight: 0, candy: 0, puzzle: 0 };

        if (decks.baseDeck !== undefined) {
            if (!Array.isArray(decks.baseDeck)) {
                errs.push("decks.baseDeck must be an array");
            } else {
                let totalInstances = 0;
                decks.baseDeck.forEach((card: unknown, i: number) => {
                    const reveal = validateModCard(card, `decks.baseDeck[${i}]`, true, seenCardIds, errs);
                    if (isRecord(card)) totalInstances += Math.max(1, (card.copies as number) || 1);
                    if (reveal && reveal !== "none") {
                        revealCounts[reveal] += 1;
                        if (revealCounts[reveal] > 1) {
                            errs.push(`decks.baseDeck: the "${reveal}" reveal may appear on at most one card`);
                        }
                        if (isRecord(card) && card.copies !== undefined && card.copies !== 1) {
                            errs.push(`decks.baseDeck[${i}]: reveal-carrying cards must have copies = 1`);
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
    }

    /** Returns the card's curated reveal classification (for baseDeck tallies). */
    function validateModCard(
        card: unknown,
        label: string,
        allowReveal: boolean,
        seenIds: Set<string>,
        errs: string[]
    ): RevealEffectId | "none" | undefined {
        if (!isRecord(card)) {
            errs.push(`${label} must be an object`);
            return undefined;
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

        // Reveal (secondary) payload: curated catalog only.
        const reveal = revealEffectOf({
            secondaryResources: card.secondaryResources as never,
            secondaryEffects: card.secondaryEffects as never,
        });
        if (reveal === "invalid") {
            errs.push(`${label}: reveal effects must be one of the curated options (fight / candy / puzzle)`);
            return undefined;
        }
        if (!allowReveal && reveal !== "none") {
            errs.push(`${label}: market cards cannot carry reveal effects`);
        }
        return reveal;
    }
};
