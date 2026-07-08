import { describe, it, expect } from "vitest";
import { actionRegistry } from "../../../actions/action-registry";
// Side-effect import: registers all core actions on the singleton.
import "../../../actions/core-actions";
import { CharacterEnum, DistrictIconsEnum, LocationActionsEnum, ResourceEnum } from "../../../enums";
import {
    makeCard,
    makeDistrict,
    makeGameState,
    makeLocation,
    makeMetaState,
    makePlayer,
} from "../factories";

describe("DRAW action", () => {
    it("draws the requested number of cards from the deck", () => {
        const player = makePlayer({ deck: [makeCard(), makeCard(), makeCard()], hand: [] });
        const state = makeMetaState();
        actionRegistry.execute(LocationActionsEnum.DRAW, { actionType: "draw", count: 2 } as any, state, player);
        expect(player.hand).toHaveLength(2);
        expect(player.deck).toHaveLength(1);
    });

    it("accepts the legacy selectionNumber param", () => {
        const player = makePlayer({ deck: [makeCard(), makeCard()], hand: [] });
        actionRegistry.execute(LocationActionsEnum.DRAW, { selectionNumber: 1 } as any, makeMetaState(), player);
        expect(player.hand).toHaveLength(1);
    });

    it("rebuilds the deck from the discard pile when the deck is empty", () => {
        const player = makePlayer({ deck: [], discardPile: [makeCard(), makeCard()], hand: [] });
        actionRegistry.execute(LocationActionsEnum.DRAW, { actionType: "draw", count: 1 } as any, makeMetaState(), player);
        expect(player.hand).toHaveLength(1);
    });

    it("defaults to drawing one card when no count is given", () => {
        const player = makePlayer({ deck: [makeCard()], hand: [] });
        actionRegistry.execute(LocationActionsEnum.DRAW, {} as any, makeMetaState(), player);
        expect(player.hand).toHaveLength(1);
    });
});

describe("DISCARD action", () => {
    it("rejects an empty selection", () => {
        const player = makePlayer();
        const result = actionRegistry.execute(LocationActionsEnum.DISCARD, { actionType: "discard", cardIds: [] } as any, makeMetaState(), player);
        expect(result.success).toBe(false);
        expect(result.error).toContain("at least one card");
    });

    it("rejects cards that are not in hand", () => {
        const player = makePlayer({ hand: [makeCard({ id: "a" })] });
        const result = actionRegistry.execute(LocationActionsEnum.DISCARD, { actionType: "discard", cardIds: ["missing"] } as any, makeMetaState(), player);
        expect(result.success).toBe(false);
        expect(result.error).toContain("not in hand");
    });

    it("moves selected cards from hand to discard pile", () => {
        const a = makeCard({ id: "a" });
        const b = makeCard({ id: "b" });
        const player = makePlayer({ hand: [a, b] });
        const result = actionRegistry.execute(LocationActionsEnum.DISCARD, { actionType: "discard", cardIds: ["a"] } as any, makeMetaState(), player);
        expect(result.success).toBe(true);
        expect(player.hand).toEqual([b]);
        expect(player.discardPile).toEqual([a]);
    });
});

describe("TRASH action", () => {
    it("rejects an empty selection", () => {
        const result = actionRegistry.execute(LocationActionsEnum.TRASH, { actionType: "trash", cardIds: [] } as any, makeMetaState(), makePlayer());
        expect(result.error).toContain("at least one card");
    });

    it("rejects trashing below the minimum deck size of 5", () => {
        const player = makePlayer({ hand: [makeCard({ id: "a" })], deck: [makeCard()], discardPile: [] });
        const result = actionRegistry.execute(LocationActionsEnum.TRASH, { actionType: "trash", cardIds: ["a"] } as any, makeMetaState(), player);
        expect(result.success).toBe(false);
        expect(result.error).toContain("minimum size");
    });

    it("rejects cards not in hand", () => {
        const player = makePlayer({
            hand: [makeCard({ id: "a" })],
            deck: [makeCard(), makeCard(), makeCard(), makeCard(), makeCard()],
        });
        const result = actionRegistry.execute(LocationActionsEnum.TRASH, { actionType: "trash", cardIds: ["x"] } as any, makeMetaState(), player);
        expect(result.error).toContain("not in hand");
    });

    it("moves selected cards to the trash pile", () => {
        const a = makeCard({ id: "a" });
        const player = makePlayer({
            hand: [a, makeCard({ id: "b" })],
            deck: [makeCard(), makeCard(), makeCard(), makeCard(), makeCard()],
        });
        const result = actionRegistry.execute(LocationActionsEnum.TRASH, { actionType: "trash", cardIds: ["a"] } as any, makeMetaState(), player);
        expect(result.success).toBe(true);
        expect(player.trashPile).toEqual([a]);
        expect(player.hand.map(c => c.id)).toEqual(["b"]);
    });
});

describe("ADD_PRESENCE_TOKEN action", () => {
    it("creates presence from the context location's district", () => {
        const district = makeDistrict({ id: DistrictIconsEnum.D3, presence: {} });
        const state = makeMetaState({ G: makeGameState({ districts: [district] }) });
        const player = makePlayer({ id: "0" });
        actionRegistry.execute(
            LocationActionsEnum.ADD_PRESENCE_TOKEN,
            { actionType: "addPresenceToken" } as any,
            state,
            player,
            { location: makeLocation({ districtId: DistrictIconsEnum.D3 }) }
        );
        expect(state.G.districts[0].presence["0"]).toEqual({ playerID: "0", amount: 1 });
    });

    it("increments existing presence for the same player", () => {
        const district = makeDistrict({ id: DistrictIconsEnum.D3, presence: { "0": { playerID: "0", amount: 1 } } });
        const state = makeMetaState({ G: makeGameState({ districts: [district] }) });
        actionRegistry.execute(
            LocationActionsEnum.ADD_PRESENCE_TOKEN,
            { actionType: "addPresenceToken", districtId: DistrictIconsEnum.D3 } as any,
            state,
            makePlayer({ id: "0" })
        );
        expect(state.G.districts[0].presence["0"].amount).toBe(2);
    });

    it("no-ops when no district can be resolved", () => {
        const state = makeMetaState({ G: makeGameState({ districts: [] }) });
        expect(() =>
            actionRegistry.execute(LocationActionsEnum.ADD_PRESENCE_TOKEN, { actionType: "addPresenceToken" } as any, state, makePlayer())
        ).not.toThrow();
    });

    it("no-ops when the district id does not exist", () => {
        const state = makeMetaState({ G: makeGameState({ districts: [makeDistrict({ id: DistrictIconsEnum.D1 })] }) });
        actionRegistry.execute(
            LocationActionsEnum.ADD_PRESENCE_TOKEN,
            { actionType: "addPresenceToken", districtId: "DOES-NOT-EXIST" } as any,
            state,
            makePlayer({ id: "0" })
        );
        expect(state.G.districts[0].presence).toEqual({});
    });
});

describe("GET_SWORD_MASTER action", () => {
    it("grants one current and one max worker", () => {
        const player = makePlayer({ currentNumberOfWorkers: 1, maxNumberOfWorkers: 2 });
        actionRegistry.execute(LocationActionsEnum.GET_SWORD_MASTER, { actionType: "getSwordMaster" } as any, makeMetaState(), player);
        expect(player.currentNumberOfWorkers).toBe(2);
        expect(player.maxNumberOfWorkers).toBe(3);
    });
});

describe("BUY_CARD action", () => {
    it("rejects an empty market", () => {
        const state = makeMetaState({ G: makeGameState({ cardMarket: [] }) });
        const result = actionRegistry.execute(LocationActionsEnum.BUY_CARD, { actionType: "buyCard", targetCardId: "x" } as any, state, makePlayer());
        expect(result.error).toContain("empty");
    });

    it("rejects a card not in the visible market row", () => {
        const market = [makeCard({ id: "a" }), makeCard({ id: "b" })];
        const state = makeMetaState({ G: makeGameState({ cardMarket: market }) });
        const result = actionRegistry.execute(LocationActionsEnum.BUY_CARD, { actionType: "buyCard", targetCardId: "zzz" } as any, state, makePlayer());
        expect(result.error).toContain("not available");
    });

    it("removes the bought card from the market into the discard pile", () => {
        const target = makeCard({ id: "buy-me", name: "Buy Me" });
        const state = makeMetaState({ G: makeGameState({ cardMarket: [target, makeCard()] }) });
        const player = makePlayer({ discardPile: [] });
        const result = actionRegistry.execute(LocationActionsEnum.BUY_CARD, { actionType: "buyCard", targetCardId: "buy-me" } as any, state, player);
        expect(result.success).toBe(true);
        expect(state.G.cardMarket.find(c => c.id === "buy-me")).toBeUndefined();
        expect(player.discardPile.map(c => c.id)).toContain("buy-me");
    });
});

describe("SIGNET_TRIGGER action", () => {
    it("no-ops for a player without a character", () => {
        const player = makePlayer({ characterId: undefined, loot: 0 });
        actionRegistry.execute(LocationActionsEnum.SIGNET_TRIGGER, { actionType: "signetTrigger" } as any, makeMetaState(), player);
        expect(player.loot).toBe(0);
    });

    it("runs the character's signet ability", () => {
        const player = makePlayer({ characterId: CharacterEnum.StreetWizards, [ResourceEnum.Loot]: 0 });
        actionRegistry.execute(LocationActionsEnum.SIGNET_TRIGGER, { actionType: "signetTrigger" } as any, makeMetaState(), player);
        expect(player[ResourceEnum.Loot]).toBe(3);
    });
});

describe("stub actions", () => {
    it("are registered and execute without effect", () => {
        for (const id of [
            LocationActionsEnum.ADVANCE_TRACKER,
            LocationActionsEnum.COOLDOWN,
            LocationActionsEnum.DEAL,
            LocationActionsEnum.STRANGE_CANDY_PUZZLE,
            LocationActionsEnum.ADD_REPAIR_TOKEN,
        ]) {
            expect(actionRegistry.has(id)).toBe(true);
            expect(actionRegistry.execute(id, {} as any, makeMetaState(), makePlayer()).success).toBe(true);
        }
    });
});
