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
