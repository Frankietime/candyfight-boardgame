import { describe, it, expect } from "vitest";
import { getBaseMod, validateModDefinition, MOD_SCHEMA_VERSION } from "../../../mods";
import { DistrictIconsEnum, LocationActionsEnum, ResourceEnum } from "../../../enums";

const expectErrors = (payload: unknown, fragment: string) => {
    const result = validateModDefinition(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) {
        expect(result.errors.join("\n")).toContain(fragment);
    }
};

describe("validateModDefinition", () => {
    it("accepts the base mod", () => {
        const result = validateModDefinition(getBaseMod());
        expect(result).toEqual({ ok: true, mod: getBaseMod() });
    });

    it("rejects non-object payloads", () => {
        expectErrors(null, "must be an object");
        expectErrors("mod", "must be an object");
        expectErrors([1, 2], "must be an object");
    });

    it("rejects wrong schema versions", () => {
        expectErrors({ ...getBaseMod(), schemaVersion: MOD_SCHEMA_VERSION + 1 }, "schemaVersion");
    });

    it("rejects empty or oversized names", () => {
        expectErrors({ ...getBaseMod(), name: "" }, "name");
        expectErrors({ ...getBaseMod(), name: "x".repeat(41) }, "name");
    });

    it("rejects a wrong number of districts", () => {
        const mod = getBaseMod();
        expectErrors({ ...mod, districts: mod.districts.slice(0, 3) }, "exactly 4");
    });

    it("rejects out-of-order district ids (fixed board layout)", () => {
        const mod = getBaseMod();
        const districts = [mod.districts[1], mod.districts[0], mod.districts[2], mod.districts[3]];
        expectErrors({ ...mod, districts }, `districts[0].id must be ${DistrictIconsEnum.D1}`);
    });

    it("rejects a district with more or fewer than 4 locations", () => {
        const mod = getBaseMod();
        mod.districts[0].locations.push({ name: "Extra", cost: {}, reward: {} });
        expectErrors(mod, "districts[0].locations must be an array of exactly 4");
    });

    it("rejects unknown resource ids and non-integer amounts", () => {
        const mod = getBaseMod();
        mod.districts[0].locations[1].reward = {
            resources: [{ resourceId: "gold" as ResourceEnum, amount: 1 }],
        };
        expectErrors(mod, "resourceId must be one of");

        const mod2 = getBaseMod();
        mod2.districts[0].locations[1].reward = {
            resources: [{ resourceId: ResourceEnum.Candy, amount: 1.5 }],
        };
        expectErrors(mod2, "amount must be an integer");
    });

    it("rejects unregistered action ids", () => {
        const mod = getBaseMod();
        mod.districts[0].locations[1].reward = {
            actions: [{ actionId: "explode" as LocationActionsEnum, name: "boom" }],
        };
        expectErrors(mod, "must be a registered action");
    });

    it("rejects cost actions without a requirements array", () => {
        const mod = getBaseMod();
        mod.districts[0].locations[1].cost = {
            actions: [{ actionId: LocationActionsEnum.DISCARD, name: "discard 2" } as never],
        };
        expectErrors(mod, "requirements must be an array");
    });

    it("rejects insane gameConfig values", () => {
        expectErrors({ ...getBaseMod(), gameConfig: { victoryPoints: 0 } }, "victoryPoints");
        expectErrors({ ...getBaseMod(), gameConfig: { initialCandy: -1 } }, "initialCandy");
        expectErrors({ ...getBaseMod(), gameConfig: { initialLoot: 100 } }, "initialLoot");
    });

    it("accepts phase-2 decks and phase-3 signets shallowly", () => {
        const result = validateModDefinition({ ...getBaseMod(), decks: { baseDeck: [] }, signets: [] });
        expect(result.ok).toBe(true);
        expectErrors({ ...getBaseMod(), decks: "nope" }, "decks");
        expectErrors({ ...getBaseMod(), signets: "nope" }, "signets");
    });

    it("collects multiple errors in one pass", () => {
        const mod = getBaseMod();
        const result = validateModDefinition({ ...mod, name: "", schemaVersion: 99 });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
});

describe("validateModDefinition — decks (phase 2)", () => {
    const withBaseDeck = (mutate: (mod: ReturnType<typeof getBaseMod>) => void) => {
        const mod = getBaseMod();
        mutate(mod);
        return validateModDefinition(mod);
    };

    it("accepts the base mod's decks", () => {
        expect(validateModDefinition(getBaseMod()).ok).toBe(true);
    });

    it("accepts absent decks (phase-1 payloads fall back to base)", () => {
        const mod = getBaseMod();
        delete (mod as unknown as Record<string, unknown>).decks;
        // Base market locations reference tier1, which the fallback provides.
        expect(validateModDefinition(mod).ok).toBe(true);
    });

    it("rejects duplicated card ids across decks", () => {
        const result = withBaseDeck(mod => {
            mod.decks!.marketTiers![0].cards[0].id = mod.decks!.baseDeck![0].id;
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.join("\n")).toContain("duplicated");
    });

    it("rejects out-of-range copies and unknown district ids", () => {
        const bad = withBaseDeck(mod => { mod.decks!.baseDeck![0].copies = 99; });
        expect(bad.ok).toBe(false);

        const badDistrict = withBaseDeck(mod => {
            mod.decks!.baseDeck![0].districtIds = ["LOC9" as never];
        });
        expect(badDistrict.ok).toBe(false);
    });

    it("rejects input-requiring primary effects on cards", () => {
        const result = withBaseDeck(mod => {
            mod.decks!.baseDeck![0].primaryEffects = [
                { actionId: LocationActionsEnum.BUY_CARD, name: "buy" },
            ];
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.join("\n")).toContain("must not require user input");
    });

    it("rejects reveal payloads outside the curated catalog", () => {
        const result = withBaseDeck(mod => {
            mod.decks!.baseDeck![0].secondaryResources = [{ resourceId: ResourceEnum.Loot, amount: 2 }];
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.join("\n")).toContain("curated");
    });

    it("rejects a second card with the same reveal type in the base deck", () => {
        const result = withBaseDeck(mod => {
            mod.decks!.baseDeck![0].secondaryResources = [{ resourceId: ResourceEnum.Candy, amount: 1 }];
            // bd-pair-24 already carries the candy reveal.
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.join("\n")).toContain("at most one card");
    });

    it("rejects reveal effects on market cards", () => {
        const result = withBaseDeck(mod => {
            mod.decks!.marketTiers![0].cards[0].secondaryResources = [{ resourceId: ResourceEnum.Candy, amount: 1 }];
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.join("\n")).toContain("market cards cannot carry reveal effects");
    });

    it("rejects duplicated or empty tiers", () => {
        const dupTier = withBaseDeck(mod => {
            mod.decks!.marketTiers!.push({ ...mod.decks!.marketTiers![0] });
        });
        expect(dupTier.ok).toBe(false);

        const emptyTier = withBaseDeck(mod => {
            mod.decks!.marketTiers!.push({ id: "tier2", name: "T2", cards: [] });
        });
        expect(emptyTier.ok).toBe(false);
    });

    it("rejects a location referencing a non-existent tier", () => {
        const result = withBaseDeck(mod => {
            mod.districts[0].locations[1].marketTierId = "ghost-tier";
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.join("\n")).toContain("existing market tier");
    });

    it("rejects a base deck below the instance floor", () => {
        const result = withBaseDeck(mod => {
            mod.decks!.baseDeck = [
                { id: "solo", name: "Solo", districtIds: [DistrictIconsEnum.D1] },
            ];
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.join("\n")).toContain("at least 4");
    });
});
