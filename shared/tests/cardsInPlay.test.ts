/**
 * cardsInPlay tests — the cards each player played this round must be tracked
 * (they drive the "card played by each enemy" display and the location glow).
 *
 * Regression: `getInitialPlayersState` didn't initialize `cardsInPlay`, so in
 * real games `player.cardsInPlay?.push(card)` was a silent no-op and nothing
 * was ever tracked. It must also RESET each round (maintenance).
 */
import { describe, it, expect } from "vitest";
import { Client } from "boardgame.io/client";
import { Game } from "../Game";
import { enumerate } from "../ai/botEnumerate";
import { toPublicPlayer } from "../services/playerViewService";
import { playersSetup } from "../game-helper";
import { CharacterEnum } from "../enums";
import type { GameState } from "../types";

describe("cardsInPlay tracking (real Game setup)", () => {
    it("records the played card and exposes it in the public player view", () => {
        const client = Client({
            game: { ...Game, seed: 7, playerView: undefined } as any,
            numPlayers: 2,
            playerID: "0",
        });
        client.start();
        client.updatePlayerID("0");
        client.moves.selectCharacter(CharacterEnum.Kawaiisis);
        client.updatePlayerID("1");
        client.moves.selectCharacter(CharacterEnum.TechBros);

        const { G, ctx } = client.getState()! as any;
        const seat = ctx.currentPlayer;
        client.updatePlayerID(seat);

        const placement = enumerate(G, ctx, seat).find(m => m.move === "placeWorker");
        expect(placement, "no legal placement in opening hand").toBeDefined();
        (client.moves as any).placeWorker(...placement!.args);

        const player = client.getState()!.G.players[seat];
        expect(player.cardsInPlay?.map((c: any) => c.id)).toContain((placement!.args[2] as any).id);

        // Public view (what enemies see) must expose the played cards.
        expect(toPublicPlayer(player).cardsInPlay.map((c: any) => c.id))
            .toContain((placement!.args[2] as any).id);
    });
});

describe("cardsInPlay round reset", () => {
    it("playersSetup (maintenance) clears last round's played cards", () => {
        const G = {
            players: {
                "0": { id: "0", maxNumberOfWorkers: 2, currentNumberOfWorkers: 0, cardsInPlay: [{ id: "x" }] },
                "1": { id: "1", maxNumberOfWorkers: 2, currentNumberOfWorkers: 0, cardsInPlay: [{ id: "y" }] },
            },
        } as unknown as GameState;

        playersSetup(G);

        expect(G.players["0"].cardsInPlay).toEqual([]);
        expect(G.players["1"].cardsInPlay).toEqual([]);
    });
});
