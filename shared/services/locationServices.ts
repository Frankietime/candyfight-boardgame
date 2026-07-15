import { DistrictIconsEnum, LocationActionsEnum } from "../enums";
import { District, Location, LocationReward } from "../types";
import { discardCost } from "./actions/requirements";
import { buildDistrictsFromMod, getBaseMod } from "../mods";

export { DISTRICT_POSITIONS } from "../mods/buildFromMod";

export const getInitialLocationReward = (): LocationReward => ({
    resources: [
        // {resourceId: ResourceEnum.Candy, amount: 1},
        // {resourceId: ResourceEnum.Loot, amount: 1},
    ],
    actions: [{ actionId: LocationActionsEnum.DRAW, name: "draw", params: { selectionNumber: 2 }}]
});

export const getHighCouncil = (district: DistrictIconsEnum, locIndex: number): Location => ({
    Id: `${district.toString()}-${locIndex}`,
    districtId: district.toString(),
    name: "High Council",
    cost: {
        districtIconIds: [district],
        actions: [discardCost(2)]
    },
    reward: {
        actions: [
            {
                actionId: LocationActionsEnum.ADVANCE_TRACKER,
                name: "+Tracker"
            },
            {
                actionId: LocationActionsEnum.ADD_PRESENCE_TOKEN,
                name: "FIGHT!"
            }
        ],
    }
});

/**
 * The canonical initial board — the built-in "Base" cartridge materialized.
 * Game content lives in shared/mods/baseMod.ts (single source of truth);
 * this stays the entry point for setup fallback, tests and the tutorial.
 */
export const getInitialDistrictsState = (): District[] =>
    buildDistrictsFromMod(getBaseMod());
