/**
 * Full-game bot playthrough harness.
 *
 * Drives a complete N-player game by picking random legal moves from
 * `enumerate` for every active seat, until gameover. Proves that Stage A
 * `enumerate` only ever emits reducer-accepted moves (no INVALID_MOVE, no
 * illegal free claim) across an entire game, at 2 and 4 seats.
 *
 * We drive the game ourselves rather than via `boardgame.io/ai` `Simulate`
 * because Simulate only steps the FIRST active player, which deadlocks in the
 * `activePlayers: { all }` phases (character selection, combat, endgame) where
 * every seat must act.
 */
import { describe, it, expect } from "vitest";
import { Client } from "boardgame.io/client";
import { Local } from "boardgame.io/multiplayer";
import { createTestGame } from "./helpers/createTestGame";
import { Game } from "../Game";
import { enumerate } from "../ai/botEnumerate";
import { CandyGreedyBot } from "../ai/CandyGreedyBot";
import { getPlayersList } from "../services/moves/playerServices";
import type { GameState } from "../types";

/** Deterministic RNG so failures reproduce. */
function mulberry32(seed: number) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Active seats this step: the all-active phases expose every seat. */
function activeSeats(ctx: any): string[] {
    return ctx.activePlayers ? Object.keys(ctx.activePlayers) : [ctx.currentPlayer];
}

function playRandomGame(numPlayers: number, seed: number, gameOverride?: any) {
    const rng = mulberry32(seed);
    // playerView disabled → client state exposes the full G that enumerate needs.
    // Seed the game's random plugin too: deck reshuffles (rebuildDeck →
    // random.Shuffle) are real randomness now, so without a fixed game seed the
    // same mulberry32 move-selection seed would still diverge between runs.
    const client = Client({
        game: gameOverride ?? { ...createTestGame(), playerView: undefined, seed: String(seed) },
        numPlayers,
    });
    client.start();

    const MAX_STEPS = 5000;
    let steps = 0;
    let rejects = 0;
    let economyMoves = 0; // placeWorker with synthesized moveParams (Stage B)

    while (!client.getState()!.ctx.gameover && steps < MAX_STEPS) {
        const state = client.getState()!;
        const { G, ctx } = state as { G: GameState; ctx: any };

        // Find a seat with a legal move.
        let acted = false;
        for (const seat of activeSeats(ctx)) {
            const moves = enumerate(G, ctx, seat);
            if (moves.length === 0) continue;

            const pick = moves[Math.floor(rng() * moves.length)];
            if (pick.move === "placeWorker" && pick.args.length === 4) economyMoves++;
            const beforeID = state._stateID;
            client.updatePlayerID(seat);
            (client.moves as any)[pick.move](...pick.args);

            // A legal move must advance the engine's state id.
            if (client.getState()!._stateID === beforeID) rejects++;

            // Resources must never go negative (Stage A pays real costs).
            for (const p of getPlayersList(client.getState()!.G)) {
                expect(p.candy, `candy negative after ${pick.move}`).toBeGreaterThanOrEqual(0);
                expect(p.loot, `loot negative after ${pick.move}`).toBeGreaterThanOrEqual(0);
            }

            acted = true;
            break;
        }
        if (!acted) break; // no legal move anywhere → stuck
        steps++;
    }

    return { client, steps, rejects, economyMoves, final: client.getState()! };
}

describe("RandomBot-style full-game playthrough (enumerate legality)", () => {
    it("2 seats: reaches gameover with zero rejected moves", () => {
        const { steps, rejects, final } = playRandomGame(2, 12345);
        expect(rejects).toBe(0);
        expect(final.ctx.gameover).toBeDefined();
        expect(steps).toBeLessThan(5000);
        expect(final.G.ranking.length).toBeGreaterThan(0);
    });

    it("4 seats: reaches gameover with zero rejected moves", () => {
        const { steps, rejects, final } = playRandomGame(4, 67890);
        expect(rejects).toBe(0);
        expect(final.ctx.gameover).toBeDefined();
        expect(steps).toBeLessThan(5000);
        expect(final.G.ranking.length).toBeGreaterThan(0);
    });

    it("is deterministic for a fixed seed", () => {
        const a = playRandomGame(4, 999);
        const b = playRandomGame(4, 999);
        expect(a.steps).toBe(b.steps);
        expect(a.final.G.ranking.map((r: any) => r.id)).toEqual(b.final.G.ranking.map((r: any) => r.id));
    });

    it("REAL game (full decks + market): completes and uses the economy line (Stage B)", () => {
        // The real Game has full random decks and a stocked market, so trash
        // costs and BUY_CARD rewards become reachable for the bots.
        const realGame: any = { ...Game, seed: 42, playerView: undefined };
        const { rejects, economyMoves, final } = playRandomGame(4, 4242, realGame);

        expect(rejects).toBe(0);
        expect(final.ctx.gameover).toBeDefined();
        // Acceptance (spec subtask 12): at least one placement used synthesized
        // moveParams (discard/trash cost or market buy) and was accepted.
        expect(economyMoves).toBeGreaterThan(0);
    });
});

// ── greedy bot ───────────────────────────────────────────────────────────────

async function playGreedyGame(numPlayers: number, seed: string) {
    const game = { ...createTestGame(), playerView: undefined };
    const client = Client({ game, numPlayers });
    client.start();

    // One bot per seat, distinct seeds so tie-breaks differ per seat.
    const bots = Object.fromEntries(
        Array.from({ length: numPlayers }, (_, i) => [
            String(i),
            new CandyGreedyBot({ game, seed: `${seed}-${i}` }),
        ])
    );

    const MAX_STEPS = 5000;
    let steps = 0;
    let rejects = 0;

    while (!client.getState()!.ctx.gameover && steps < MAX_STEPS) {
        const state = client.getState()!;
        const ctx: any = state.ctx;

        let acted = false;
        for (const seat of activeSeats(ctx)) {
            const { action } = await bots[seat].play(state as any, seat);
            if (!action) continue;

            const beforeID = state._stateID;
            (client.store as any).dispatch(action);
            if (client.getState()!._stateID === beforeID) rejects++;

            for (const p of getPlayersList(client.getState()!.G)) {
                expect(p.candy, `candy negative for ${p.id}`).toBeGreaterThanOrEqual(0);
                expect(p.loot, `loot negative for ${p.id}`).toBeGreaterThanOrEqual(0);
            }

            acted = true;
            break;
        }
        if (!acted) break;
        steps++;
    }

    return { steps, rejects, final: client.getState()! };
}

describe("CandyGreedyBot full-game playthrough", () => {
    it("4 greedy bots: reaches gameover with zero rejected moves and a ranking", async () => {
        const { steps, rejects, final } = await playGreedyGame(4, "greedy");
        expect(rejects).toBe(0);
        expect(final.ctx.gameover).toBeDefined();
        expect(steps).toBeLessThan(5000);
        expect(final.G.ranking.length).toBe(4);
    });

    it("2 greedy bots: completes too", async () => {
        const { rejects, final } = await playGreedyGame(2, "duel");
        expect(rejects).toBe(0);
        expect(final.ctx.gameover).toBeDefined();
    });

    it("plays through the Local({ bots }) transport like the client does (1 human + 3 bots)", async () => {
        // Mirrors the vs-Bots client wiring: human seat '0', greedy bots on the
        // rest, LocalMaster auto-plays bot seats. The human seat is driven here
        // by picking its first legal enumerate move whenever it can act.
        const numPlayers = 4;
        const game: any = { ...createTestGame(), playerView: undefined };
        const bots = Object.fromEntries(
            Array.from({ length: numPlayers - 1 }, (_, i) => [String(i + 1), CandyGreedyBot])
        );
        const human = Client({
            game,
            numPlayers,
            playerID: "0",
            matchID: "vs-bots-test",
            multiplayer: Local({ bots }),
        });
        human.start();

        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
        const deadline = Date.now() + 30_000;

        while (Date.now() < deadline) {
            const state = human.getState();
            if (!state) { await sleep(20); continue; }
            if (state.ctx.gameover) break;

            const ctx: any = state.ctx;
            const humanActive = ctx.activePlayers
                ? "0" in ctx.activePlayers
                : ctx.currentPlayer === "0";

            if (humanActive) {
                const moves = enumerate(state.G, ctx, "0");
                if (moves.length > 0) {
                    const pick = moves[0];
                    (human.moves as any)[pick.move](...pick.args);
                }
            }
            // Yield so LocalMaster's 100ms bot timers can fire.
            await sleep(25);
        }

        const final = human.getState()!;
        expect(final.ctx.gameover).toBeDefined();
        expect(final.G.ranking.length).toBe(numPlayers);
        human.stop();
    }, 40_000);

    it("prefers an objective-improving placement over reveal on the first main turn", async () => {
        const game = { ...createTestGame(), playerView: undefined };
        const client = Client({ game, numPlayers: 2 });
        client.start();
        const bot = new CandyGreedyBot({ game, seed: "pref" });

        // Drive character selection with the bot, then land in mainPhase.
        // All seats stay "active" after choosing, so skip seats with no move.
        while (client.getState()!.ctx.phase === "characterSelectionPhase") {
            for (const seat of activeSeats(client.getState()!.ctx)) {
                const { action } = await bot.play(client.getState() as any, seat);
                if (action) {
                    (client.store as any).dispatch(action);
                    break;
                }
            }
        }
        expect(client.getState()!.ctx.phase).toBe("mainPhase");

        // First mainPhase decision: placing a worker scores soloDistrict/boardPresence,
        // revealing scores nothing → greedy must place, never reveal or draw.
        const seat = client.getState()!.ctx.currentPlayer;
        const { action } = await bot.play(client.getState() as any, seat);
        expect(action.payload.type).toBe("placeWorker");
    });
});
