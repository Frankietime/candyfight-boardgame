import { describe, it, expect } from "vitest";
import {
    dealHands,
    resetTurnState,
    revealPlayer,
    resolveCombat,
    discardAllHands,
    calculateRanking,
} from "../../../services/moves/phaseService";
import { NO_CARD_SELECTED } from "../../../constants";
import { identityRandom, makeCard, makeDistrict, makeGameState, makePlayer } from "../factories";

describe("dealHands", () => {
    it("draws five cards for every player", () => {
        const G = makeGameState({
            players: {
                "0": makePlayer({ id: "0", deck: Array.from({ length: 6 }, () => makeCard()), hand: [] }),
                "1": makePlayer({ id: "1", deck: Array.from({ length: 6 }, () => makeCard()), hand: [] }),
            },
        });
        dealHands(G, identityRandom);
        expect(G.players["0"].hand).toHaveLength(5);
        expect(G.players["1"].hand).toHaveLength(5);
    });
});

describe("resetTurnState", () => {
    it("clears played flag and selected card", () => {
        const player = makePlayer({ hasPlayedCard: true, selectedCard: makeCard() });
        resetTurnState(player);
        expect(player.hasPlayedCard).toBe(false);
        expect(player.selectedCard).toBe(NO_CARD_SELECTED);
    });
});

describe("revealPlayer", () => {
    it("marks the player as revealed", () => {
        const player = makePlayer({ hasRevealed: false });
        revealPlayer(player);
        expect(player.hasRevealed).toBe(true);
    });
});

describe("resolveCombat", () => {
    it("awards a victory point to the winner of each contested district", () => {
        const G = makeGameState({
            players: { "0": makePlayer({ id: "0", victoryPoints: 0 }), "1": makePlayer({ id: "1" }) },
            districts: [
                makeDistrict({
                    name: "Streets",
                    presence: { "0": { playerID: "0", amount: 2 }, "1": { playerID: "1", amount: 1 } },
                }),
            ],
        });
        resolveCombat(G);
        expect(G.districts[0].combatWinnerId).toBe("0");
        expect(G.players["0"].victoryPoints).toBe(1);
    });

    it("logs a draw and awards nobody when presence ties", () => {
        const G = makeGameState({
            players: { "0": makePlayer({ id: "0" }), "1": makePlayer({ id: "1" }) },
            districts: [
                makeDistrict({
                    name: "Streets",
                    presence: { "0": { playerID: "0", amount: 1 }, "1": { playerID: "1", amount: 1 } },
                }),
            ],
        });
        resolveCombat(G);
        expect(G.districts[0].combatWinnerId).toBeUndefined();
        expect(G.players["0"].victoryPoints).toBe(0);
        expect(G.log.some(e => e.message.includes("draw"))).toBe(true);
    });
});

describe("discardAllHands", () => {
    it("moves every player's hand into their discard pile", () => {
        const G = makeGameState({
            players: { "0": makePlayer({ id: "0", hand: [makeCard(), makeCard()], discardPile: [makeCard()] }) },
        });
        discardAllHands(G);
        expect(G.players["0"].hand).toEqual([]);
        expect(G.players["0"].discardPile).toHaveLength(3);
    });
});

describe("calculateRanking", () => {
    it("orders by victory points, then candy, then loot", () => {
        const G = makeGameState({
            players: {
                "0": makePlayer({ id: "0", victoryPoints: 1, candy: 0, loot: 0 }),
                "1": makePlayer({ id: "1", victoryPoints: 3, candy: 0, loot: 0 }),
                "2": makePlayer({ id: "2", victoryPoints: 1, candy: 5, loot: 0 }),
            },
        });
        calculateRanking(G);
        expect(G.ranking.map(p => p.id)).toEqual(["1", "2", "0"]);
    });

    it("breaks a candy tie by loot", () => {
        const G = makeGameState({
            players: {
                "0": makePlayer({ id: "0", victoryPoints: 0, candy: 2, loot: 1 }),
                "1": makePlayer({ id: "1", victoryPoints: 0, candy: 2, loot: 9 }),
            },
        });
        calculateRanking(G);
        expect(G.ranking[0].id).toBe("1");
        expect(G.log.some(e => e.message.includes("wins the game"))).toBe(true);
    });
});
