/**
 * firstPlayerID tests — the round's first player is stamped into G so the UI
 * can render the first-player marker (⭐). With TurnOrder.DEFAULT the first
 * player rotates each round, so it must be captured at round start, not derived.
 */
import { describe, it, expect } from "vitest";
import { Client } from "boardgame.io/client";
import { createTestGame } from "./helpers/createTestGame";
import { CharacterEnum } from "../enums";

function startGame() {
    const client = Client({
        game: { ...createTestGame(), playerView: undefined },
        numPlayers: 2,
        playerID: "0",
    });
    client.start();
    client.updatePlayerID("0");
    client.moves.selectCharacter(CharacterEnum.Kawaiisis);
    client.updatePlayerID("1");
    client.moves.selectCharacter(CharacterEnum.TechBros);
    return client;
}

describe("G.firstPlayerID", () => {
    it("is stamped with the round's first acting player when mainPhase begins", () => {
        const client = startGame();
        const { G, ctx } = client.getState()! as any;
        expect(ctx.phase).toBe("mainPhase");
        expect(G.firstPlayerID).toBe(ctx.currentPlayer);
    });

    it("keeps the round's first player while turns advance", () => {
        const client = startGame();
        const first = (client.getState()!.G as any).firstPlayerID;

        // First player reveals → turn passes to the other seat.
        client.updatePlayerID(first);
        client.moves.reveal();

        const { G, ctx } = client.getState()! as any;
        expect(ctx.currentPlayer).not.toBe(first);
        expect(G.firstPlayerID).toBe(first); // unchanged mid-round
    });

    it("4 players: turns run COUNTER-CLOCKWISE (0 red → 2 green → 1 violet → 3 yellow)", () => {
        const client = Client({
            game: { ...createTestGame(), playerView: undefined },
            numPlayers: 4,
            playerID: "0",
        });
        client.start();
        const chars = Object.values(CharacterEnum);
        for (let i = 0; i < 4; i++) {
            client.updatePlayerID(String(i));
            client.moves.selectCharacter(chars[i]);
        }

        // Round 1 starts at the ring's first seat, then walks the ring as
        // each player reveals.
        const sequence: string[] = [];
        for (let i = 0; i < 4; i++) {
            const seat = client.getState()!.ctx.currentPlayer;
            sequence.push(seat);
            client.updatePlayerID(seat);
            client.moves.reveal();
        }
        expect(sequence).toEqual(["0", "2", "1", "3"]);

        // Next round's first player also rotates counter-clockwise: after red comes green.
        for (const seat of ["0", "1", "2", "3"]) {
            client.updatePlayerID(seat);
            client.moves.endRound();
        }
        const { G, ctx } = client.getState()! as any;
        expect(ctx.phase).toBe("mainPhase");
        expect(G.firstPlayerID).toBe("2");
        expect(ctx.currentPlayer).toBe("2");
    });

    it("is re-stamped for the next round (rotates with TurnOrder.DEFAULT)", () => {
        const client = startGame();
        const round1First = (client.getState()!.G as any).firstPlayerID;

        // Complete the round: both reveal, both end combat.
        for (const seat of [round1First, round1First === "0" ? "1" : "0"]) {
            client.updatePlayerID(seat);
            client.moves.reveal();
        }
        expect(client.getState()!.ctx.phase).toBe("combatPhase");
        for (const seat of ["0", "1"]) {
            client.updatePlayerID(seat);
            client.moves.endRound();
        }

        const { G, ctx } = client.getState()! as any;
        expect(ctx.phase).toBe("mainPhase"); // next round
        expect(G.firstPlayerID).toBe(ctx.currentPlayer);
        expect(G.firstPlayerID).not.toBe(round1First); // rotated (2 players)
    });
});
