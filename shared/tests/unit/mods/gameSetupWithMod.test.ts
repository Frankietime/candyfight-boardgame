import { describe, it, expect } from "vitest";
import { Client } from "boardgame.io/client";
import { Game } from "../../../Game";
import { getBaseMod } from "../../../mods";
import { getInitialDistrictsState } from "../../../services/locationServices";
import { GameState } from "../../../types";
import { ResourceEnum } from "../../../enums";

const stateOf = (client: ReturnType<typeof Client>): GameState =>
    client.getState()!.G as GameState;

// playerView disabled: these tests inspect every seat's full deck.
const makeClient = (setupData?: unknown) =>
    Client({
        game: { ...Game, setup: (ctx: any) => (Game.setup as any)(ctx, setupData), playerView: undefined },
        numPlayers: 2,
    });

describe("Game.setup with a mod cartridge", () => {
    it("builds the board and config from a valid mod", () => {
        const mod = getBaseMod();
        mod.name = "Test Cartridge";
        mod.districts[0].name = "MODDED DISTRICT";
        mod.districts[0].locations[3] = {
            name: "VP Shrine",
            cost: { resources: [{ resourceId: ResourceEnum.Candy, amount: 1 }] },
            reward: { resources: [{ resourceId: ResourceEnum.VictoryPoints, amount: 1 }] },
        };
        mod.gameConfig = { victoryPoints: 9, initialCandy: 4 };

        const G = stateOf(makeClient({ mod }));

        expect(G.districts[0].name).toBe("MODDED DISTRICT");
        expect(G.districts[0].locations[3].name).toBe("VP Shrine");
        expect(G.districts[0].locations[3].Id).toBe(`${G.districts[0].id}-3`);
        expect(G.config.victoryPoints).toBe(9);
        expect(G.config.initialCandy).toBe(4);
        expect(G.players["0"][ResourceEnum.Candy]).toBe(4);
    });

    it("falls back to the base board when the mod is invalid", () => {
        const G = stateOf(makeClient({ mod: { schemaVersion: 999 } }));
        expect(G.districts).toEqual(getInitialDistrictsState());
    });

    it("uses the base board when no mod is present (back-compat)", () => {
        const G = stateOf(makeClient({ victoryPoints: 4 }));
        expect(G.districts).toEqual(getInitialDistrictsState());
        expect(G.config.victoryPoints).toBe(4);
    });

    it("lets explicit setupData override the mod's gameConfig", () => {
        const mod = { ...getBaseMod(), gameConfig: { victoryPoints: 9 } };
        const G = stateOf(makeClient({ mod, victoryPoints: 3 }));
        expect(G.config.victoryPoints).toBe(3);
    });

    it("does not leak the mod payload into config", () => {
        const G = stateOf(makeClient({ mod: getBaseMod() }));
        expect((G.config as unknown as Record<string, unknown>).mod).toBeUndefined();
    });

    it("builds one shuffled market pile per mod tier and stamps locations", () => {
        const mod = getBaseMod();
        mod.decks!.marketTiers = [
            ...mod.decks!.marketTiers!,
            { id: "tier2", name: "Tier 2", cards: [{ id: "t2-solo", name: "Solo", districtIds: [] }] },
        ];
        mod.districts[1].locations[0].marketTierId = "tier2"; // ECO Market

        const G = stateOf(makeClient({ mod }));
        expect(Object.keys(G.markets).sort()).toEqual(["tier1", "tier2"]);
        expect(G.markets.tier2.map(c => c.id)).toEqual(["t2-solo#tier2.1"]);
        expect(G.districts[1].locations[0].marketTierId).toBe("tier2");
        // The other market keeps the default tier.
        expect(G.districts[0].locations[1].marketTierId).toBe("tier1");
    });

    it("builds player decks from the mod baseDeck with per-player ids + auto Signet", () => {
        const mod = getBaseMod();
        mod.decks!.baseDeck = [
            { id: "solo", name: "Solo", districtIds: [], copies: 4 },
        ];
        const G = stateOf(makeClient({ mod }));

        const deckIds = (seat: string) => {
            const p = G.players[seat];
            return [...p.deck, ...p.hand].map(c => c.id).sort();
        };
        expect(deckIds("0")).toEqual(["signet#p0", "solo#p0.1", "solo#p0.2", "solo#p0.3", "solo#p0.4"]);
        expect(deckIds("1")).toEqual(["signet#p1", "solo#p1.1", "solo#p1.2", "solo#p1.3", "solo#p1.4"]);
    });

    it("falls back to the base decks when the mod carries none (phase-1 payloads)", () => {
        const mod = getBaseMod();
        delete (mod as unknown as Record<string, unknown>).decks;
        const G = stateOf(makeClient({ mod }));
        expect(G.markets.tier1).toHaveLength(12);
        const p0 = G.players["0"];
        expect([...p0.deck, ...p0.hand]).toHaveLength(8); // 7 base cards + signet
    });
});

describe("Game.validateSetupData", () => {
    const validate = Game.validateSetupData as (setupData: unknown, numPlayers: number) => string | undefined;

    it("accepts matches without a mod and with a valid mod", () => {
        expect(validate(undefined, 2)).toBeUndefined();
        expect(validate({ victoryPoints: 6 }, 2)).toBeUndefined();
        expect(validate({ mod: getBaseMod() }, 2)).toBeUndefined();
    });

    it("rejects an invalid mod with the validation errors", () => {
        const error = validate({ mod: { schemaVersion: 999 } }, 2);
        expect(error).toContain("Invalid mod");
        expect(error).toContain("schemaVersion");
    });
});
