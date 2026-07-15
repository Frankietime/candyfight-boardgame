import { describe, it, expect } from "vitest";
import {
    buildMarketsFromMod,
    buildPlayerDeckFromMod,
    instantiateModCard,
    resolveDecks,
    SIGNET_MOD_CARD,
} from "../../../mods/instantiateCards";
import { getBaseMod } from "../../../mods/baseMod";
import { DistrictIconsEnum, LocationActionsEnum } from "../../../enums";
import { DEFAULT_MARKET_TIER } from "../../../constants";
import { ModCard } from "../../../mods/types";

const modCard = (overrides: Partial<ModCard> = {}): ModCard => ({
    id: "test-card",
    name: "Test",
    districtIds: [DistrictIconsEnum.D1],
    ...overrides,
});

describe("instantiateModCard", () => {
    it("suffixes the authored id and strips copies", () => {
        const card = instantiateModCard(modCard({ copies: 3 }), "p0.1");
        expect(card.id).toBe("test-card#p0.1");
        expect("copies" in card).toBe(false);
        expect(card.name).toBe("Test");
    });

    it("clones districtIds (no shared array with the mod)", () => {
        const authored = modCard();
        const card = instantiateModCard(authored, "x");
        card.districtIds.push(DistrictIconsEnum.D2);
        expect(authored.districtIds).toEqual([DistrictIconsEnum.D1]);
    });
});

describe("buildPlayerDeckFromMod", () => {
    it("expands copies into distinct instance ids", () => {
        const mod = getBaseMod();
        mod.decks!.baseDeck = [modCard({ copies: 3 })];
        const deck = buildPlayerDeckFromMod(mod, "0");
        const ids = deck.map(c => c.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.filter(id => id.startsWith("test-card#"))).toHaveLength(3);
    });

    it("appends the automatic Signet with a per-player id", () => {
        const deck = buildPlayerDeckFromMod(undefined, "2");
        const signet = deck[deck.length - 1];
        expect(signet.id).toBe("signet#p2");
        expect(signet.primaryEffects?.[0].actionId).toBe(LocationActionsEnum.SIGNET_TRIGGER);
    });

    it("two players never share an instance id", () => {
        const a = buildPlayerDeckFromMod(undefined, "0").map(c => c.id);
        const b = buildPlayerDeckFromMod(undefined, "1").map(c => c.id);
        expect(a.some(id => b.includes(id))).toBe(false);
    });

    it("falls back to the base deck when the mod has no decks", () => {
        const deck = buildPlayerDeckFromMod(undefined, "0");
        // 7 base cards + signet
        expect(deck).toHaveLength(getBaseMod().decks!.baseDeck!.length + 1);
    });
});

describe("buildMarketsFromMod", () => {
    it("builds one pile per tier with tier-scoped instance ids", () => {
        const mod = getBaseMod();
        mod.decks!.marketTiers = [
            { id: "tier1", name: "T1", cards: [modCard({ id: "a" })] },
            { id: "tier2", name: "T2", cards: [modCard({ id: "b", copies: 2 })] },
        ];
        const markets = buildMarketsFromMod(mod);
        expect(Object.keys(markets).sort()).toEqual(["tier1", "tier2"]);
        expect(markets.tier1.map(c => c.id)).toEqual(["a#tier1.1"]);
        expect(markets.tier2.map(c => c.id)).toEqual(["b#tier2.1", "b#tier2.2"]);
    });

    it("falls back to the base tier when the mod has no tiers", () => {
        const markets = buildMarketsFromMod(undefined);
        expect(markets[DEFAULT_MARKET_TIER]).toHaveLength(12);
    });
});

describe("resolveDecks", () => {
    it("falls back per field", () => {
        const mod = getBaseMod();
        mod.decks = { baseDeck: [modCard()] }; // no marketTiers
        const resolved = resolveDecks(mod);
        expect(resolved.baseDeck).toHaveLength(1);
        expect(resolved.marketTiers[0].id).toBe(DEFAULT_MARKET_TIER);
    });

    it("SIGNET_MOD_CARD spans all districts", () => {
        expect(SIGNET_MOD_CARD.districtIds).toEqual(Object.values(DistrictIconsEnum));
    });
});
