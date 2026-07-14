/**
 * placeWorker validation tests — the reducer must reject placements whose
 * cost/reward actions cannot run (spec subtask 13: no illegal free claims).
 *
 * Board facts used here (locationServices):
 *   D1 loc 2 — High Council: cost discard(2), reward tracker+presence
 *   D1 loc 1 — CONURBA Market: cost trash(2), reward BUY_CARD
 */
import { describe, it, expect } from "vitest";
import { Client } from "boardgame.io/client";
import { createTestGame, SIGNET_CARD } from "./helpers/createTestGame";
import { CharacterEnum } from "../enums";
import type { GameState } from "../types";

const HIGH_COUNCIL = { d: 0, l: 2 };
const CONURBA_MARKET = { d: 0, l: 1 };

function reachMainPhase(numPlayers = 2) {
    const client = Client({
        game: { ...createTestGame(), playerView: undefined },
        numPlayers,
        playerID: "0",
    });
    client.start();
    const chars = Object.values(CharacterEnum);
    for (let i = 0; i < numPlayers; i++) {
        client.updatePlayerID(String(i));
        client.moves.selectCharacter(chars[i]);
    }
    const seat = client.getState()!.ctx.currentPlayer;
    client.updatePlayerID(seat);
    return { client, seat };
}

const G = (client: any): GameState => client.getState()!.G;

describe("placeWorker — input-requiring cost validation", () => {
    it("rejects High Council without moveParams (missing discard cardIds)", () => {
        const { client, seat } = reachMainPhase();
        const before = structuredClone(G(client));

        // SIGNET covers all district icons; no cardIds provided for discard(2).
        client.moves.placeWorker(HIGH_COUNCIL.d, HIGH_COUNCIL.l, SIGNET_CARD);

        const after = G(client);
        const location = after.districts[HIGH_COUNCIL.d].locations[HIGH_COUNCIL.l];
        expect(location.takenByPlayerID).toBeUndefined();
        expect(after.players[seat]).toEqual(before.players[seat]);
    });

    it("rejects the market without moveParams (missing trash cardIds and buy target)", () => {
        const { client, seat } = reachMainPhase();
        const before = structuredClone(G(client));

        client.moves.placeWorker(CONURBA_MARKET.d, CONURBA_MARKET.l, SIGNET_CARD);

        const after = G(client);
        const location = after.districts[CONURBA_MARKET.d].locations[CONURBA_MARKET.l];
        expect(location.takenByPlayerID).toBeUndefined();
        expect(after.players[seat]).toEqual(before.players[seat]);
    });

    it("rejects cardIds that include the played card", () => {
        const { client, seat } = reachMainPhase();
        const hand = G(client).players[seat].hand;
        const others = hand.filter(c => c.id !== SIGNET_CARD.id).slice(0, 1);

        client.moves.placeWorker(HIGH_COUNCIL.d, HIGH_COUNCIL.l, SIGNET_CARD, {
            costParams: { cardIds: [SIGNET_CARD.id, others[0].id] },
        });

        const location = G(client).districts[HIGH_COUNCIL.d].locations[HIGH_COUNCIL.l];
        expect(location.takenByPlayerID).toBeUndefined();
    });

    it("rejects the wrong discard count (1 instead of 2)", () => {
        const { client, seat } = reachMainPhase();
        const hand = G(client).players[seat].hand;
        const other = hand.find(c => c.id !== SIGNET_CARD.id)!;

        client.moves.placeWorker(HIGH_COUNCIL.d, HIGH_COUNCIL.l, SIGNET_CARD, {
            costParams: { cardIds: [other.id] },
        });

        const location = G(client).districts[HIGH_COUNCIL.d].locations[HIGH_COUNCIL.l];
        expect(location.takenByPlayerID).toBeUndefined();
    });

    it("accepts High Council with valid discard cardIds and actually pays the cost", () => {
        const { client, seat } = reachMainPhase();
        const before = G(client).players[seat];
        const toDiscard = before.hand.filter(c => c.id !== SIGNET_CARD.id).slice(0, 2);
        expect(toDiscard).toHaveLength(2);

        client.moves.placeWorker(HIGH_COUNCIL.d, HIGH_COUNCIL.l, SIGNET_CARD, {
            costParams: { cardIds: toDiscard.map(c => c.id) },
        });

        const after = G(client);
        const location = after.districts[HIGH_COUNCIL.d].locations[HIGH_COUNCIL.l];
        const player = after.players[seat];

        expect(location.takenByPlayerID).toBe(seat);
        // Cost actually paid: the 2 chosen cards left the hand and landed in the
        // discard pile. (Hand length itself isn't asserted: the played SIGNET
        // card triggers the character's signet ability, which for some
        // characters draws a card — so 5 - 1 - 2 is not necessarily the count.)
        const handIds = player.hand.map(c => c.id);
        const discardedIds = player.discardPile.map(c => c.id);
        for (const c of toDiscard) {
            expect(handIds).not.toContain(c.id);
            expect(discardedIds).toContain(c.id);
        }
        // Claim (+1) + ADD_PRESENCE_TOKEN reward (+1); the played SIGNET card's
        // own effects may add more — only the fix's floor is asserted.
        expect(after.districts[HIGH_COUNCIL.d].presence[seat].amount).toBeGreaterThanOrEqual(2);
    });

    it("keeps no-cost placements working (Easy Job unaffected by the fix)", () => {
        const { client, seat } = reachMainPhase();
        // Easy Job = district 2, location 0; needs a D3 card — SIGNET works.
        client.moves.placeWorker(2, 0, SIGNET_CARD);
        expect(G(client).districts[2].locations[0].takenByPlayerID).toBe(seat);
    });
});

describe("placeWorker — forged card not in hand", () => {
    it("rejects a card id that is not actually in the player's hand, leaving state unchanged", () => {
        const { client, seat } = reachMainPhase();
        const before = structuredClone(G(client));

        // Easy Job (district 2, location 0): no resource cost, only needs a
        // D3 card — SIGNET's districtIds cover D3, so a forged copy of it
        // would satisfy isWorkerPlacementValid's district-icon check if the
        // hand-membership check didn't run first.
        const forgedCard = { ...SIGNET_CARD, id: "forged-card-not-in-hand" };
        client.moves.placeWorker(2, 0, forgedCard);

        const after = G(client);
        expect(after.districts[2].locations[0].takenByPlayerID).toBeUndefined();
        expect(after.players[seat]).toEqual(before.players[seat]);
    });
});

describe("placeWorker — out-of-range district/location index", () => {
    it("rejects an out-of-range districtID without throwing and without mutating state", () => {
        const { client, seat } = reachMainPhase();
        const before = structuredClone(G(client));

        expect(() => client.moves.placeWorker(99, 0, SIGNET_CARD)).not.toThrow();

        const after = G(client);
        expect(after.players[seat]).toEqual(before.players[seat]);
    });

    it("rejects an out-of-range locationID without throwing and without mutating state", () => {
        const { client, seat } = reachMainPhase();
        const before = structuredClone(G(client));

        expect(() => client.moves.placeWorker(0, 99, SIGNET_CARD)).not.toThrow();

        const after = G(client);
        expect(after.players[seat]).toEqual(before.players[seat]);
    });
});

describe("placeWorker — restricted areas", () => {
    // Restricted areas per locationServices: D1 loc 0, D2 loc 2, D3 loc 2, D4 loc 3.
    const RESTRICTED = [
        { d: 0, l: 0 },
        { d: 1, l: 2 },
        { d: 2, l: 2 },
        { d: 3, l: 3 },
    ];

    it("the reducer rejects placements at every restricted area (not just the UI)", () => {
        for (const { d, l } of RESTRICTED) {
            const { client, seat } = reachMainPhase();
            expect(G(client).districts[d].locations[l].isRestrictedArea).toBe(true);

            client.moves.placeWorker(d, l, SIGNET_CARD);

            const location = G(client).districts[d].locations[l];
            expect(location.takenByPlayerID, `restricted (${d},${l}) was claimed`).toBeUndefined();
            expect(G(client).players[seat].hasPlayedCard).toBe(false);
        }
    });
});
