import { DistrictIconsEnum } from "../enums";
import { CostAction, GameConfig, ResourceBag, RewardAction } from "../types";

/**
 * Mod schema version. Bump when the ModDefinition shape changes in a way old
 * payloads can't satisfy; validateModDefinition rejects mismatched versions.
 */
export const MOD_SCHEMA_VERSION = 1;

/** Id of the built-in cartridge (not stored in the DB). */
export const BASE_MOD_ID = "base";

/**
 * A game "cartridge": a pure-JSON definition of the game's content.
 * Everything here must be serializable (no functions) — it travels as
 * boardgame.io setupData and is stored as a jsonb payload.
 *
 * Layout (district x/y, tile positions) is intentionally NOT part of the mod:
 * mods define content, the client owns the fixed 4x4 board layout.
 */
export interface ModDefinition {
    id: string;
    name: string;
    description: string;
    schemaVersion: number;
    /** Defaults for match config; explicit setupData fields override these. */
    gameConfig?: Partial<Pick<GameConfig, "initialCandy" | "initialLoot" | "victoryPoints">>;
    /** Exactly 4 districts, ids LOC1..LOC4 in order (fixed board layout). */
    districts: ModDistrict[];
    /** PHASE 2 — deck building. Schema reserved; ignored by the phase-1 loader. */
    decks?: ModDecks;
    /** PHASE 3 — character signets. Schema reserved. */
    signets?: ModSignet[];
}

export interface ModDistrict {
    id: DistrictIconsEnum;
    name: string;
    /** Exactly 4 locations (fixed board layout). */
    locations: ModLocation[];
}

export interface ModLocation {
    name: string;
    /** districtIconIds is derived from the owning district at build time. */
    cost: { resources?: ResourceBag[]; actions?: CostAction[] };
    reward: { resources?: ResourceBag[]; actions?: RewardAction[] };
    isRestrictedArea?: boolean;
    /**
     * Author-disabled: the location renders struck through with a red line
     * and can never be entered (maps to runtime Location.isModDisabled).
     */
    isDisabled?: boolean;
    /** Which market tier a BUY_CARD location sells from. */
    marketTierId?: string;
}

// ---------------------------------------------------------------------------
// PHASE 2 (schema only — validated shallowly, not consumed yet)
// ---------------------------------------------------------------------------

export interface ModCard {
    id: string;
    name: string;
    districtIds: string[];
    primaryResources?: ResourceBag[];
    primaryEffects?: RewardAction[];
    secondaryResources?: ResourceBag[];
    secondaryEffects?: RewardAction[];
    /** How many copies of this card the deck contains (default 1). */
    copies?: number;
}

export interface ModMarketTier {
    id: string;
    name: string;
    cards: ModCard[];
}

export interface ModDecks {
    baseDeck?: ModCard[];
    marketTiers?: ModMarketTier[];
}

// PHASE 3 placeholder — shape to be designed with the signet system.
export type ModSignet = unknown;
