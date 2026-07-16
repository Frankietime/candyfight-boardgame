import { describe, it, expect } from "vitest";
import { validateDeckSetDefinition } from "../../../mods/validateDeckSet";
import { getBaseMod } from "../../../mods/baseMod";
import { MOD_SCHEMA_VERSION, DeckSetDefinition } from "../../../mods/types";
import { DistrictIconsEnum, ResourceEnum } from "../../../enums";

const validDeckSet = (): DeckSetDefinition => ({
    id: "ds-1",
    name: "Test Deck Set",
    description: "a reusable deck set",
    schemaVersion: MOD_SCHEMA_VERSION,
    decks: getBaseMod().decks!,
});

describe("validateDeckSetDefinition", () => {
    it("accepts a well-formed deck set (the base cartridge's decks)", () => {
        const result = validateDeckSetDefinition(validDeckSet());
        expect(result.ok).toBe(true);
    });

    it("rejects non-object payloads", () => {
        expect(validateDeckSetDefinition(null).ok).toBe(false);
        expect(validateDeckSetDefinition("x").ok).toBe(false);
    });

    it("rejects a wrong schema version", () => {
        const result = validateDeckSetDefinition({ ...validDeckSet(), schemaVersion: 99 });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.join("\n")).toContain("schemaVersion");
    });

    it("rejects an empty or oversized name", () => {
        expect(validateDeckSetDefinition({ ...validDeckSet(), name: "" }).ok).toBe(false);
        expect(validateDeckSetDefinition({ ...validDeckSet(), name: "x".repeat(41) }).ok).toBe(false);
    });

    it("rejects a missing or empty baseDeck", () => {
        const noDeck = { ...validDeckSet(), decks: { marketTiers: getBaseMod().decks!.marketTiers } };
        const result = validateDeckSetDefinition(noDeck);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.join("\n")).toContain("baseDeck must be a non-empty array");

        const emptyDeck = { ...validDeckSet(), decks: { ...validDeckSet().decks, baseDeck: [] } };
        expect(validateDeckSetDefinition(emptyDeck).ok).toBe(false);
    });

    it("rejects decks that aren't an object", () => {
        const result = validateDeckSetDefinition({ ...validDeckSet(), decks: "nope" });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.join("\n")).toContain("decks must be an object");
    });

    it("applies the SAME deck rules as ModDefinition: duplicated card ids rejected", () => {
        const deckSet = validDeckSet();
        deckSet.decks.marketTiers![0].cards[0].id = deckSet.decks.baseDeck![0].id;
        const result = validateDeckSetDefinition(deckSet);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.join("\n")).toContain("duplicated");
    });

    it("rejects market cards carrying reveal effects", () => {
        const deckSet = validDeckSet();
        deckSet.decks.marketTiers![0].cards[0].secondaryResources = [{ resourceId: ResourceEnum.Candy, amount: 1 }];
        const result = validateDeckSetDefinition(deckSet);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors.join("\n")).toContain("market cards cannot carry reveal effects");
    });

    it("rejects unknown district ids on a card", () => {
        const deckSet = validDeckSet();
        deckSet.decks.baseDeck![0].districtIds = ["LOC9" as DistrictIconsEnum];
        expect(validateDeckSetDefinition(deckSet).ok).toBe(false);
    });
});
