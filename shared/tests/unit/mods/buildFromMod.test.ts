import { describe, it, expect } from "vitest";
import {
    buildDistrictsFromMod,
    DISTRICT_POSITIONS,
    getBaseMod,
    resolveModConfig,
} from "../../../mods";
import { getInitialDistrictsState } from "../../../services/locationServices";
import { DEFAULT_GAME_CONFIG } from "../../../types";
import { DistrictIconsEnum, ResourceEnum } from "../../../enums";

describe("buildDistrictsFromMod", () => {
    const districts = buildDistrictsFromMod(getBaseMod());

    it("is the source of getInitialDistrictsState (base cartridge)", () => {
        expect(getInitialDistrictsState()).toEqual(districts);
    });

    it("merges the fixed layout positions per district", () => {
        for (const district of districts) {
            expect({ x: district.x, y: district.y }).toEqual(DISTRICT_POSITIONS[district.id]);
        }
    });

    it("generates location Ids as `${districtId}-${index}` and stamps districtId", () => {
        for (const district of districts) {
            district.locations.forEach((loc, i) => {
                expect(loc.Id).toBe(`${district.id}-${i}`);
                expect(loc.districtId).toBe(district.id);
            });
        }
    });

    it("injects the owning district icon into every location cost", () => {
        for (const district of districts) {
            for (const loc of district.locations) {
                expect(loc.cost.districtIconIds).toEqual([district.id]);
            }
        }
    });

    it("stamps restricted areas with dominanceBy", () => {
        const restricted = districts.flatMap(d => d.locations).filter(l => l.isRestrictedArea);
        expect(restricted.length).toBe(4);
        for (const loc of restricted) {
            expect(loc.dominanceBy).toEqual([]);
        }
    });

    it("starts districts with empty presence", () => {
        expect(districts.every(d => Object.keys(d.presence).length === 0)).toBe(true);
    });

    it("stamps isModDisabled for author-disabled locations (and never resets)", () => {
        const mod = getBaseMod();
        mod.districts[0].locations[1].isDisabled = true;
        const built = buildDistrictsFromMod(mod);
        expect(built[0].locations[1].isModDisabled).toBe(true);
        expect(built[0].locations[0].isModDisabled).toBeUndefined();
    });

    it("preserves modded content (names, costs, rewards)", () => {
        const mod = getBaseMod();
        mod.districts[2].name = "Modded Streets";
        mod.districts[2].locations[0] = {
            name: "VP Fountain",
            cost: { resources: [{ resourceId: ResourceEnum.Candy, amount: 2 }] },
            reward: { resources: [{ resourceId: ResourceEnum.Loot, amount: 3 }] },
        };
        const built = buildDistrictsFromMod(mod);
        expect(built[2].name).toBe("Modded Streets");
        expect(built[2].locations[0].name).toBe("VP Fountain");
        expect(built[2].locations[0].cost.resources).toEqual([{ resourceId: ResourceEnum.Candy, amount: 2 }]);
        expect(built[2].locations[0].reward.resources).toEqual([{ resourceId: ResourceEnum.Loot, amount: 3 }]);
        expect(built[2].id).toBe(DistrictIconsEnum.D3);
    });
});

describe("resolveModConfig", () => {
    it("returns defaults when no mod and no setupData", () => {
        expect(resolveModConfig(undefined, undefined)).toEqual(DEFAULT_GAME_CONFIG);
    });

    it("applies mod gameConfig over defaults", () => {
        const mod = { ...getBaseMod(), gameConfig: { victoryPoints: 10, initialCandy: 5 } };
        const config = resolveModConfig(mod, undefined);
        expect(config.victoryPoints).toBe(10);
        expect(config.initialCandy).toBe(5);
        expect(config.initialLoot).toBe(DEFAULT_GAME_CONFIG.initialLoot);
    });

    it("lets explicit setupData override the mod", () => {
        const mod = { ...getBaseMod(), gameConfig: { victoryPoints: 10 } };
        const config = resolveModConfig(mod, { victoryPoints: 3 });
        expect(config.victoryPoints).toBe(3);
    });

    it("strips the mod payload itself from setupData", () => {
        const mod = getBaseMod();
        const config = resolveModConfig(mod, { mod, initialLoot: 7 });
        expect((config as unknown as Record<string, unknown>).mod).toBeUndefined();
        expect(config.initialLoot).toBe(7);
    });
});
