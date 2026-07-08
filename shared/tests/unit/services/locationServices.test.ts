import { describe, it, expect } from "vitest";
import {
    getInitialLocationReward,
    getHighCouncil,
    getInitialDistrictsState,
} from "../../../services/locationServices";
import { DistrictIconsEnum, LocationActionsEnum } from "../../../enums";

describe("getInitialLocationReward", () => {
    it("rewards a draw-2 action by default", () => {
        const reward = getInitialLocationReward();
        expect(reward.actions?.[0].actionId).toBe(LocationActionsEnum.DRAW);
        expect(reward.actions?.[0].params).toEqual({ selectionNumber: 2 });
    });
});

describe("getHighCouncil", () => {
    it("costs a discard and rewards advance-tracker + presence", () => {
        const loc = getHighCouncil(DistrictIconsEnum.D1, 2);
        expect(loc.Id).toBe(`${DistrictIconsEnum.D1}2`);
        expect(loc.cost.actions?.[0].actionId).toBe(LocationActionsEnum.DISCARD);
        const rewardIds = loc.reward.actions?.map(a => a.actionId);
        expect(rewardIds).toEqual([
            LocationActionsEnum.ADVANCE_TRACKER,
            LocationActionsEnum.ADD_PRESENCE_TOKEN,
        ]);
    });
});

describe("getInitialDistrictsState", () => {
    const districts = getInitialDistrictsState();

    it("builds the four canonical districts", () => {
        expect(districts).toHaveLength(4);
        expect(districts.map(d => d.id)).toEqual([
            DistrictIconsEnum.D1,
            DistrictIconsEnum.D2,
            DistrictIconsEnum.D3,
            DistrictIconsEnum.D4,
        ]);
    });

    it("starts every district with empty presence", () => {
        expect(districts.every(d => Object.keys(d.presence).length === 0)).toBe(true);
    });

    it("gives each district a non-empty set of locations", () => {
        expect(districts.every(d => d.locations.length > 0)).toBe(true);
    });

    it("marks one restricted area per district", () => {
        for (const d of districts) {
            expect(d.locations.some(l => l.isRestrictedArea)).toBe(true);
        }
    });
});
