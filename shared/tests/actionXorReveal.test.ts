/**
 * Rule: on your turn you either PLAY AN ACTION (place a worker) or REVEAL —
 * never both. After placing, the only way to end the turn is `pass`; reveal
 * becomes available again on a later turn where you haven't placed.
 */
import { describe, it, expect } from "vitest";
import { Client } from "boardgame.io/client";
import { createTestGame, D3_CARD, LOC } from "./helpers/createTestGame";
import { enumerate } from "../ai/botEnumerate";
import { CharacterEnum } from "../enums";

function reachMainPhase() {
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
    const seat = client.getState()!.ctx.currentPlayer;
    client.updatePlayerID(seat);
    return { client, seat };
}

describe("one action XOR reveal per turn", () => {
    it("reveal is rejected on the same turn a worker was placed", () => {
        const { client, seat } = reachMainPhase();
        client.moves.placeWorker(LOC.EASY_JOB.districtIdx, LOC.EASY_JOB.locationIdx, D3_CARD);
        expect(client.getState()!.G.players[seat].hasPlayedCard).toBe(true);

        client.moves.reveal();

        const after = client.getState()!;
        expect(after.G.players[seat].hasRevealed).toBe(false); // rejected
        expect(after.ctx.currentPlayer).toBe(seat);            // turn did not end
    });

    it("after placing, the turn ends with pass and reveal works on a later turn", () => {
        const { client, seat } = reachMainPhase();
        client.moves.placeWorker(LOC.EASY_JOB.districtIdx, LOC.EASY_JOB.locationIdx, D3_CARD);
        client.moves.pass();
        expect(client.getState()!.ctx.currentPlayer).not.toBe(seat);

        // Other player reveals straight away (no placement) — allowed.
        const other = client.getState()!.ctx.currentPlayer;
        client.updatePlayerID(other);
        client.moves.reveal();
        expect(client.getState()!.G.players[other].hasRevealed).toBe(true);

        // Back to the first seat: fresh turn (hasPlayedCard reset) → reveal allowed.
        client.updatePlayerID(seat);
        client.moves.reveal();
        expect(client.getState()!.G.players[seat].hasRevealed).toBe(true);
        expect(client.getState()!.ctx.phase).toBe("combatPhase");
    });

    it("enumerate mirrors the rule: reveal offered only before placing", () => {
        const { client, seat } = reachMainPhase();
        const before = enumerate(client.getState()!.G, client.getState()!.ctx, seat).map(m => m.move);
        expect(before).toContain("reveal");
        expect(before).not.toContain("pass");

        client.moves.placeWorker(LOC.EASY_JOB.districtIdx, LOC.EASY_JOB.locationIdx, D3_CARD);

        const after = enumerate(client.getState()!.G, client.getState()!.ctx, seat).map(m => m.move);
        expect(after).not.toContain("reveal");
        expect(after).toEqual(["pass"]); // the only legal follow-up
    });
});
