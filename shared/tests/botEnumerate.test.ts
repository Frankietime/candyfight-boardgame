/**
 * botEnumerate tests — per-phase valid-move enumeration (Stage A).
 *
 * Mirrors mainPhase.test.ts style (boardgame.io Client + createTestGame).
 * createTestGame starts in characterSelectionPhase with EMPTY hands; selecting
 * a character for every seat cascades characterSelection → maintenance (deals
 * 5 cards) → mainPhase.
 */
import { describe, it, expect } from "vitest";
import { Client } from "boardgame.io/client";
import { createTestGame } from "./helpers/createTestGame";
import { enumerate, locationNeedsInput, DRAW_CAP } from "../ai/botEnumerate";
import { CharacterEnum } from "../enums";
import type { GameState } from "../types";

// ── helpers ─────────────────────────────────────────────────────────────────

// enumerate runs server-side against the FULL, unfiltered state. Disable
// playerView so the test client exposes every seat's full state (otherwise
// non-viewed players are stripped to public ViewModels with no `hand`).
function makeClient(numPlayers = 2) {
    const client = Client({
        game: { ...createTestGame(), playerView: undefined },
        numPlayers,
        playerID: "0",
    });
    client.start();
    return client;
}

/** Drive character selection for every seat → cascades into mainPhase. */
function reachMainPhase(numPlayers = 2) {
    const client = makeClient(numPlayers);
    const chars = Object.values(CharacterEnum);
    for (let i = 0; i < numPlayers; i++) {
        client.updatePlayerID(String(i));
        client.moves.selectCharacter(chars[i]);
    }
    client.updatePlayerID("0");
    return client;
}

const G = (client: any): GameState => client.getState()!.G;
const CTX = (client: any) => client.getState()!.ctx;
const moveNames = (moves: { move: string }[]) => moves.map(m => m.move);

// ── characterSelectionPhase ──────────────────────────────────────────────────

describe("enumerate — characterSelectionPhase", () => {
    it("offers selectCharacter once per unclaimed character (4) at start", () => {
        const client = makeClient();
        expect(CTX(client).phase).toBe("characterSelectionPhase");

        const moves = enumerate(G(client), CTX(client), "0");
        expect(moves.every(m => m.move === "selectCharacter")).toBe(true);
        expect(moves).toHaveLength(Object.values(CharacterEnum).length);
        const offered = moves.map(m => m.args[0]);
        expect(new Set(offered)).toEqual(new Set(Object.values(CharacterEnum)));
    });

    it("drops a character once another player has claimed it", () => {
        const client = makeClient();
        client.updatePlayerID("0");
        client.moves.selectCharacter(CharacterEnum.ChillDudes);

        // Now enumerate for player '1': ChillDudes must be gone.
        const moves = enumerate(G(client), CTX(client), "1");
        const offered = moves.map(m => m.args[0]);
        expect(offered).not.toContain(CharacterEnum.ChillDudes);
        expect(moves).toHaveLength(Object.values(CharacterEnum).length - 1);
    });

    it("returns [] for a player who already chose", () => {
        const client = makeClient();
        client.updatePlayerID("0");
        client.moves.selectCharacter(CharacterEnum.ChillDudes);

        const moves = enumerate(G(client), CTX(client), "0");
        expect(moves).toEqual([]);
    });
});

// ── mainPhase ────────────────────────────────────────────────────────────────

describe("enumerate — mainPhase (Stage A)", () => {
    it("includes the no-input worker placements (Easy Job, Sword Master, Time is Gold)", () => {
        const client = reachMainPhase();
        expect(CTX(client).phase).toBe("mainPhase");

        const moves = enumerate(G(client), CTX(client), "0");
        const placements = moves.filter(m => m.move === "placeWorker");

        const targets = new Set(placements.map(m => `${m.args[0]},${m.args[1]}`));
        expect(targets).toContain("2,0"); // Easy Job  (D3, loc 0)
        expect(targets).toContain("3,2"); // Sword Master (D4, loc 2)
        expect(targets).toContain("3,1"); // Time is Gold (D4, loc 1)
    });

    it("never emits a placement at a restricted area", () => {
        const client = reachMainPhase();
        const districts = G(client).districts;
        const moves = enumerate(G(client), CTX(client), CTX(client).currentPlayer);

        for (const m of moves.filter(x => x.move === "placeWorker")) {
            const [d, l] = m.args as [number, number];
            expect(districts[d].locations[l].isRestrictedArea ?? false).toBe(false);
        }
    });

    it("emits input-requiring locations ONLY with synthesized moveParams (Stage B)", () => {
        const client = reachMainPhase();
        const moves = enumerate(G(client), CTX(client), CTX(client).currentPlayer);
        const districts = G(client).districts;

        for (const m of moves.filter(x => x.move === "placeWorker")) {
            const [d, l, , moveParams] = m.args as [number, number, any, any];
            const location = districts[d].locations[l];
            if (locationNeedsInput(location)) {
                expect(moveParams, `${location.name} emitted without moveParams`).toBeDefined();
            }
        }
    });

    it("synthesizes a High Council discard: exactly 2 spare cards, never the played card", () => {
        const client = reachMainPhase();
        const seat = CTX(client).currentPlayer;
        const moves = enumerate(G(client), CTX(client), seat);

        // High Council of D1 sits at district 0, location 2 (cost: discard 2).
        const hc = moves.filter(m => m.move === "placeWorker" && m.args[0] === 0 && m.args[1] === 2);
        expect(hc.length).toBeGreaterThan(0);
        for (const m of hc) {
            const [, , card, moveParams] = m.args as [number, number, any, any];
            expect(moveParams.costParams.cardIds).toHaveLength(2);
            expect(moveParams.costParams.cardIds).not.toContain(card.id);
        }
    });

    it("excludes trash-cost locations while the collection is at the 5-card minimum", () => {
        const client = reachMainPhase();
        const seat = CTX(client).currentPlayer;
        // Test game: 5 total cards → trash guard blocks CONURBA Market (0,1),
        // ECO Market (1,0), Momentum (1,1) and Bargain (2,1).
        const moves = enumerate(G(client), CTX(client), seat);
        const trashTargets = ["0,1", "1,0", "1,1", "2,1"];
        for (const m of moves.filter(x => x.move === "placeWorker")) {
            expect(trashTargets).not.toContain(`${m.args[0]},${m.args[1]}`);
        }
    });

    it("synthesizes trash + market buy once the collection and market allow it", () => {
        const client = reachMainPhase();
        const seat = CTX(client).currentPlayer;
        const g: GameState = structuredClone(G(client));
        const p = g.players[seat];
        // Grow the collection past the trash minimum and stock the market.
        p.deck = Array.from({ length: 4 }, (_, i) => ({ ...p.hand[0], id: `deck-${i}` }));
        g.cardMarket = Array.from({ length: 3 }, (_, i) => ({ ...p.hand[0], id: `market-${i}` }));

        const moves = enumerate(g, CTX(client), seat);
        // ECO Market (1,0): cost trash(2) + reward BUY_CARD.
        const market = moves.filter(m => m.move === "placeWorker" && m.args[0] === 1 && m.args[1] === 0);
        expect(market.length).toBeGreaterThan(0);
        for (const m of market) {
            const [, , card, moveParams] = m.args as [number, number, any, any];
            expect(moveParams.costParams.cardIds).toHaveLength(2);
            expect(moveParams.costParams.cardIds).not.toContain(card.id);
            expect(moveParams.rewardParams.targetCardId).toMatch(/^market-/);
        }
    });

    it("offers reveal and draw, but NOT pass, before any placement", () => {
        const client = reachMainPhase();
        // The 5-card test deck is fully dealt, so give the player a drawable deck.
        const g: GameState = structuredClone(G(client));
        const p = g.players[CTX(client).currentPlayer];
        p.deck = [{ ...p.hand[0], id: "deck-1" }];

        const names = moveNames(enumerate(g, CTX(client), CTX(client).currentPlayer));
        expect(names).toContain("reveal");
        expect(names).toContain("draw");
        expect(names).not.toContain("pass");
    });

    it("offers ONLY pass after a placement (one action XOR reveal)", () => {
        const client = reachMainPhase();
        const seat = CTX(client).currentPlayer;
        client.updatePlayerID(seat);
        // Easy Job needs only a D3 icon, no resources.
        const first = enumerate(G(client), CTX(client), seat).find(m => m.move === "placeWorker")!;
        client.moves.placeWorker(...(first.args as [number, number, any]));

        const names = moveNames(enumerate(G(client), CTX(client), seat));
        expect(names).toEqual(["pass"]);
    });

    it("stops offering draw when deck and discard are both empty (no-op guard)", () => {
        const client = reachMainPhase();
        const g: GameState = structuredClone(G(client));
        const p = g.players[CTX(client).currentPlayer];
        p.deck = [];
        p.discardPile = [];

        const names = moveNames(enumerate(g, CTX(client), CTX(client).currentPlayer));
        expect(names).not.toContain("draw");
    });

    it("stops offering draw once the hand reaches DRAW_CAP", () => {
        const client = reachMainPhase();
        // Force a large hand without playing a card (clone to escape immer freeze).
        const g: GameState = structuredClone(G(client));
        const p = g.players[CTX(client).currentPlayer];
        p.deck = [{ ...p.hand[0], id: "deck-1" }]; // drawable → only the cap blocks
        while (p.hand.length < DRAW_CAP) p.hand.push({ ...p.hand[0], id: `pad-${p.hand.length}` });

        const names = moveNames(enumerate(g, CTX(client), CTX(client).currentPlayer));
        expect(names).not.toContain("draw");
    });
});

// ── trivial phases ───────────────────────────────────────────────────────────

describe("enumerate — trivial phases", () => {
    it("combatPhase → exactly [endRound]", () => {
        const ctx = { phase: "combatPhase", currentPlayer: "0" } as any;
        expect(enumerate({} as GameState, ctx, "0")).toEqual([{ move: "endRound", args: [] }]);
    });

    it("endGamePhase → exactly [goToLobby]", () => {
        const ctx = { phase: "endGamePhase", currentPlayer: "0" } as any;
        expect(enumerate({} as GameState, ctx, "0")).toEqual([{ move: "goToLobby", args: [] }]);
    });

    it("maintenancePhase and unknown → []", () => {
        expect(enumerate({} as GameState, { phase: "maintenancePhase" } as any, "0")).toEqual([]);
        expect(enumerate({} as GameState, { phase: "???" } as any, "0")).toEqual([]);
    });
});
