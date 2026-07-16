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

/** True when a location's reward sells cards (has a BUY_CARD action). */
export const sellsCards = (loc: ModLocation): boolean =>
    !!loc.reward.actions?.some(a => a.actionId === LocationActionsEnum.BUY_CARD);

/**
 * Default market-tier assignment for BUY_CARD locations that don't set an
 * explicit `marketTierId`: round-robin across the mod's authored tiers (or
 * the base default when none exist yet), in district/location traversal
 * order — so e.g. with two tiers, the first market location on the board
 * defaults to tier 1 and the second to tier 2.
 *
 * Keyed by `${districtIndex}:${locationIndex}` so both game setup
 * (buildDistrictsFromMod) and the Mod Lab editor (location dialog's default
 * selection) compute the IDENTICAL default — what the author sees while
 * editing is what actually plays.
 */
export const defaultMarketTierIds = (
    mod: Pick<ModDefinition, "districts" | "decks">
): Map<string, string> => {
    const tierIds = (mod.decks?.marketTiers ?? []).map(tier => tier.id);
    const cycle = tierIds.length > 0 ? tierIds : [DEFAULT_MARKET_TIER];
    const map = new Map<string, string>();
    let marketIndex = 0;
    mod.districts.forEach((district, districtIndex) => {
        district.locations.forEach((loc, locationIndex) => {
            if (!sellsCards(loc)) return;
            map.set(`${districtIndex}:${locationIndex}`, cycle[marketIndex % cycle.length]);
            marketIndex++;
        });
    });
    return map;
};

/**
 * Materialize a mod's districts into the runtime District[] shape:
 * fixed positions merged in, location Ids generated as `${districtId}-${index}`,
 * cost.districtIconIds derived from the owning district.
 */
export const buildDistrictsFromMod = (mod: ModDefinition): District[] => {
    const defaults = defaultMarketTierIds(mod);

    return mod.districts.map((district, districtIndex) => ({
        id: district.id,
        name: district.name,
        ...DISTRICT_POSITIONS[district.id],
        presence: {},
        locations: district.locations.map((loc, locationIndex): Location => ({
            Id: `${district.id}-${locationIndex}`,
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
            ...(sellsCards(loc)
                ? { marketTierId: loc.marketTierId ?? defaults.get(`${districtIndex}:${locationIndex}`) }
                : {}),
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
