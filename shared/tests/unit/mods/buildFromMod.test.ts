import { describe, it, expect } from "vitest";
import {
    buildDistrictsFromMod,
    defaultMarketTierIds,
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

describe("defaultMarketTierIds — round-robin across market locations", () => {
    it("with a single tier, every market location defaults to it (base mod)", () => {
        const mod = getBaseMod();
        const defaults = defaultMarketTierIds(mod);
        expect(new Set(defaults.values())).toEqual(new Set(["tier1"]));
        // Base mod has 2 market locations (CONURBA Market, ECO Market).
        expect(defaults.size).toBe(2);
    });

    it("with two tiers, the first market location gets tier1 and the second tier2, in board order", () => {
        const mod = getBaseMod();
        mod.decks!.marketTiers!.push({ id: "tier2", name: "Tier 2", cards: mod.decks!.marketTiers![0].cards });
        const defaults = defaultMarketTierIds(mod);

        // CONURBA Market: district 0 (D1), location 1.
        expect(defaults.get("0:1")).toBe("tier1");
        // ECO Market: district 1 (D2), location 0.
        expect(defaults.get("1:0")).toBe("tier2");
    });

    it("built districts stamp marketTierId per the round-robin default when unset", () => {
        const mod = getBaseMod();
        mod.decks!.marketTiers!.push({ id: "tier2", name: "Tier 2", cards: mod.decks!.marketTiers![0].cards });
        const built = buildDistrictsFromMod(mod);
        expect(built[0].locations[1].marketTierId).toBe("tier1"); // CONURBA Market
        expect(built[1].locations[0].marketTierId).toBe("tier2"); // ECO Market
    });

    it("an explicit marketTierId on a location always wins over the round-robin default", () => {
        const mod = getBaseMod();
        mod.decks!.marketTiers!.push({ id: "tier2", name: "Tier 2", cards: mod.decks!.marketTiers![0].cards });
        mod.districts[0].locations[1].marketTierId = "tier2"; // force CONURBA Market onto tier2
        const built = buildDistrictsFromMod(mod);
        expect(built[0].locations[1].marketTierId).toBe("tier2");
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
