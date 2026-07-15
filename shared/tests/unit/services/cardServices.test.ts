import { describe, it, expect } from "vitest";
import {
    getInitialDeck,
    getTierOneCards,
    getTierTwoCards,
    getMarketTierOneCards,
    getDistrictCard,
    getSignetCard,
} from "../../../services/cardServices";
import { DistrictIconsEnum } from "../../../enums";

describe("getDistrictCard", () => {
    it("joins district ids into id/name and assigns a unique id", () => {
        const card = getDistrictCard([DistrictIconsEnum.D1, DistrictIconsEnum.D2]);
        expect(card.districtIds).toEqual([DistrictIconsEnum.D1, DistrictIconsEnum.D2]);
        expect(card.name).toBe(`${DistrictIconsEnum.D1}-${DistrictIconsEnum.D2}`);
        expect(card.id).toContain(`${DistrictIconsEnum.D1}-${DistrictIconsEnum.D2}`);
    });

    it("produces distinct ids on repeated calls", () => {
        const a = getDistrictCard([DistrictIconsEnum.D1]);
        const b = getDistrictCard([DistrictIconsEnum.D1]);
        expect(a.id).not.toBe(b.id);
    });
});

describe("getSignetCard", () => {
    it("covers all four districts and triggers the signet effect", () => {
        const signet = getSignetCard();
        expect(signet.name).toBe("Signet");
        expect(signet.districtIds).toHaveLength(4);
        expect(signet.primaryEffects?.[0].actionId).toBe("signetTrigger");
    });
});

describe("getTierOneCards", () => {
    it("returns one presence card per district icon", () => {
        const cards = getTierOneCards();
        expect(cards).toHaveLength(Object.values(DistrictIconsEnum).length);
        expect(cards.every(c => c.primaryEffects?.[0].actionId === "addPresenceToken")).toBe(true);
        expect(cards.every(c => c.districtIds.length === 1)).toBe(true);
    });
});

describe("getTierTwoCards", () => {
    it("carries the three curated reveal effects: fight, candy and Puzzle", () => {
        const cards = getTierTwoCards();
        expect(cards.some(c => c.secondaryEffects?.[0].actionId === "addPresenceToken")).toBe(true);
        expect(cards.some(c => c.secondaryResources?.[0].resourceId === "candy")).toBe(true);
        const puzzle = cards.find(c => c.secondaryEffects?.[0].actionId === "strangeCandyPuzzle");
        expect(puzzle?.name).toBe("Puzzle");
        expect(puzzle?.districtIds).toHaveLength(4);
    });
});

describe("getMarketTierOneCards", () => {
    it("builds all ordered district pairs excluding self-pairs", () => {
        const cards = getMarketTierOneCards();
        const districts = Object.values(DistrictIconsEnum);
        // n * (n - 1) ordered pairs with distinct elements.
        expect(cards).toHaveLength(districts.length * (districts.length - 1));
        expect(cards.every(c => c.districtIds[0] !== c.districtIds[1])).toBe(true);
        expect(cards.every(c => c.primaryEffects?.[0].actionId === "addPresenceToken")).toBe(true);
    });
});

describe("getInitialDeck", () => {
    it("contains the signet plus tier one and tier two cards", () => {
        const deck = getInitialDeck();
        const tierOne = getTierOneCards().length;
        const tierTwo = getTierTwoCards().length;
        expect(deck).toHaveLength(1 + tierOne + tierTwo);
        expect(deck[0].name).toBe("Signet");
    });
});
