import { DistrictIconsEnum, LocationActionsEnum } from "../enums";
import { DEFAULT_MARKET_TIER } from "../constants";
import { DEFAULT_GAME_CONFIG, District, GameConfig, Location } from "../types";
import { ModDefinition, ModLocation } from "./types";

/**
 * Fixed board layout — district anchor positions on the 1280x720 canvas.
 * Layout is engine/client-owned, never part of a mod (mods define content).
 */
export const DISTRICT_POSITIONS: Record<DistrictIconsEnum, { x: number; y: number }> = {
    [DistrictIconsEnum.D1]: { x: 355, y: 67 },
    [DistrictIconsEnum.D2]: { x: 613, y: 67 },
    [DistrictIconsEnum.D3]: { x: 303, y: 344 },
    [DistrictIconsEnum.D4]: { x: 665, y: 344 },
};

/**
 * Materialize a mod's districts into the runtime District[] shape:
 * fixed positions merged in, location Ids generated as `${districtId}-${index}`,
 * cost.districtIconIds derived from the owning district.
 */
const sellsCards = (loc: ModLocation): boolean =>
    !!loc.reward.actions?.some(a => a.actionId === LocationActionsEnum.BUY_CARD);

export const buildDistrictsFromMod = (mod: ModDefinition): District[] => {
    // BUY_CARD locations without an authored tier sell from the mod's first
    // tier (or the base default) — keeps phase-1 payloads playable.
    const fallbackTierId = mod.decks?.marketTiers?.[0]?.id ?? DEFAULT_MARKET_TIER;

    return mod.districts.map(district => ({
        id: district.id,
        name: district.name,
        ...DISTRICT_POSITIONS[district.id],
        presence: {},
        locations: district.locations.map((loc, index): Location => ({
            Id: `${district.id}-${index}`,
            districtId: district.id,
            name: loc.name,
            cost: {
                districtIconIds: [district.id],
                ...(loc.cost.resources ? { resources: loc.cost.resources } : {}),
                ...(loc.cost.actions ? { actions: loc.cost.actions } : {}),
            },
            reward: {
                ...(loc.reward.resources ? { resources: loc.reward.resources } : {}),
                ...(loc.reward.actions ? { actions: loc.reward.actions } : {}),
            },
            ...(loc.isRestrictedArea ? { isRestrictedArea: true, dominanceBy: [] } : {}),
            ...(loc.isDisabled ? { isModDisabled: true } : {}),
            ...(sellsCards(loc) ? { marketTierId: loc.marketTierId ?? fallbackTierId } : {}),
        })),
    }));
};

/**
 * Match config precedence: DEFAULT_GAME_CONFIG < mod.gameConfig < explicit
 * setupData fields. The `mod` key itself is stripped from setupData so the
 * cartridge payload doesn't leak into GameConfig.
 */
export const resolveModConfig = (
    mod: ModDefinition | undefined,
    setupData: Record<string, unknown> | undefined
): GameConfig => {
    const { mod: _mod, ...rest } = setupData ?? {};
    return {
        ...DEFAULT_GAME_CONFIG,
        ...(mod?.gameConfig ?? {}),
        ...rest,
    } as GameConfig;
};
