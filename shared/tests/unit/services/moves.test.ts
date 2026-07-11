import { describe, it, expect } from "vitest";
import { INVALID_MOVE } from "boardgame.io/core";
import { selectCard, draw, discard, trash } from "../../../services/moves/moves";
import { identityRandom, makeCard, makePlayer } from "../factories";

describe("selectCard", () => {
    it("sets the selected card when the play is valid", () => {
        const player = makePlayer({ hasPlayedCard: false });
        const card = makeCard({ id: "c1" });
        const result = selectCard(player, card);
        expect(result).toBeUndefined();
        expect(player.selectedCard).toBe(card);
    });

    it("returns INVALID_MOVE once a card has already been played", () => {
        const player = makePlayer({ hasPlayedCard: true });
        expect(selectCard(player, makeCard())).toBe(INVALID_MOVE);
    });

    it("clears the selection when called with no card (deselect)", () => {
        const player = makePlayer({ hasPlayedCard: false });
        player.selectedCard = makeCard({ id: "c1" });
        const result = selectCard(player, null);
        expect(result).toBeUndefined();
        expect(player.selectedCard).toBeUndefined();
    });

    it("deselects even after a card has been played (no validation on clear)", () => {
        const player = makePlayer({ hasPlayedCard: true });
        player.selectedCard = makeCard({ id: "c1" });
        expect(selectCard(player, undefined)).toBeUndefined();
        expect(player.selectedCard).toBeUndefined();
    });
});

describe("draw", () => {
    it("draws a single card when no count is given", () => {
        const player = makePlayer({ deck: [makeCard(), makeCard()], hand: [] });
        draw(player, identityRandom);
        expect(player.hand).toHaveLength(1);
        expect(player.deck).toHaveLength(1);
    });

    it("draws multiple cards when a count is given", () => {
        const player = makePlayer({ deck: [makeCard(), makeCard(), makeCard()], hand: [] });
        draw(player, identityRandom, 2);
        expect(player.hand).toHaveLength(2);
    });

    it("rebuilds the deck from discard when empty before drawing", () => {
        const player = makePlayer({ deck: [], discardPile: [makeCard(), makeCard()], hand: [] });
        draw(player, identityRandom, 1);
        expect(player.hand).toHaveLength(1);
    });

    it("rebuilds mid-count when the deck runs out", () => {
        const player = makePlayer({ deck: [makeCard()], discardPile: [makeCard(), makeCard()], hand: [] });
        draw(player, identityRandom, 2);
        expect(player.hand).toHaveLength(2);
    });
});

describe("discard", () => {
    it("moves selected cards to the discard pile", () => {
        const a = makeCard({ id: "a" });
        const player = makePlayer({ hand: [a, makeCard({ id: "b" })] });
        const result = discard(player, [a]);
        expect(result).not.toBe(INVALID_MOVE);
        expect(player.discardPile).toEqual([a]);
        expect(player.hand.map(c => c.id)).toEqual(["b"]);
    });

    it("returns INVALID_MOVE when a card is not in hand", () => {
        const player = makePlayer({ hand: [makeCard({ id: "a" })] });
        expect(discard(player, [makeCard({ id: "ghost" })])).toBe(INVALID_MOVE);
    });

    it("is a no-op for an empty selection", () => {
        const player = makePlayer({ hand: [makeCard({ id: "a" })] });
        const result = discard(player, []);
        expect(result).toEqual([]);
        expect(player.hand).toHaveLength(1);
    });
});

describe("trash", () => {
    it("moves selected cards to the trash pile when above the minimum size", () => {
        const a = makeCard({ id: "a" });
        const player = makePlayer({
            hand: [a, makeCard({ id: "b" })],
            deck: [makeCard(), makeCard(), makeCard(), makeCard()],
        });
        const result = trash(player, [a]);
        expect(result).not.toBe(INVALID_MOVE);
        expect(player.trashPile).toEqual([a]);
    });

    it("returns INVALID_MOVE when trashing would drop below 5 total cards", () => {
        const a = makeCard({ id: "a" });
        const player = makePlayer({ hand: [a], deck: [makeCard()], discardPile: [makeCard()] });
        expect(trash(player, [a])).toBe(INVALID_MOVE);
    });

    it("returns INVALID_MOVE when a card is not in hand", () => {
        const player = makePlayer({
            hand: [makeCard({ id: "a" })],
            deck: [makeCard(), makeCard(), makeCard(), makeCard(), makeCard()],
        });
        expect(trash(player, [makeCard({ id: "ghost" })])).toBe(INVALID_MOVE);
    });
});
