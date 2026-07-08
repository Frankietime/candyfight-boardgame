import { describe, it, expect } from "vitest";
import { toPublicPlayer, playerView } from "../../../services/playerViewService";
import { makeCard, makeGameState, makePlayer } from "../factories";

describe("toPublicPlayer", () => {
    it("exposes only public fields, replacing deck/hand with lengths", () => {
        const player = makePlayer({
            id: "0",
            deck: [makeCard(), makeCard()],
            hand: [makeCard()],
            candy: 4,
            loot: 1,
            victoryPoints: 2,
        });
        const view = toPublicPlayer(player);
        expect(view).toEqual({
            id: "0",
            characterId: undefined,
            hasRevealed: false,
            currentNumberOfWorkers: 2,
            victoryPoints: 2,
            deckLength: 2,
            discardPile: [],
            trashPile: [],
            handLength: 1,
            candy: 4,
            loot: 1,
        });
        expect(view).not.toHaveProperty("hand");
        expect(view).not.toHaveProperty("deck");
    });
});

describe("playerView", () => {
    const G = makeGameState({
        players: {
            "0": makePlayer({ id: "0", hand: [makeCard()] }),
            "1": makePlayer({ id: "1", hand: [makeCard(), makeCard()] }),
        },
        ranking: [makePlayer({ id: "0" })],
    });

    it("keeps the requesting player's full private state", () => {
        const filtered = playerView({ G, playerID: "0" });
        expect(filtered.players["0"]).toHaveProperty("hand");
        expect((filtered.players["0"] as any).hand).toHaveLength(1);
    });

    it("reduces other players to their public view", () => {
        const filtered = playerView({ G, playerID: "0" });
        expect(filtered.players["1"]).not.toHaveProperty("hand");
        expect((filtered.players["1"] as any).handLength).toBe(2);
    });

    it("reduces all players to public view for a spectator (null playerID)", () => {
        const filtered = playerView({ G, playerID: null });
        expect(filtered.players["0"]).not.toHaveProperty("hand");
        expect(filtered.players["1"]).not.toHaveProperty("hand");
    });

    it("builds a public playersViewModel for every player", () => {
        const filtered = playerView({ G, playerID: "0" });
        expect(filtered.playersViewModel).toHaveLength(2);
        expect(filtered.playersViewModel.map(p => p.id)).toEqual(["0", "1"]);
    });

    it("maps the ranking to public views", () => {
        const filtered = playerView({ G, playerID: "0" });
        expect(filtered.ranking[0]).not.toHaveProperty("hand");
    });
});
