import { describe, it, expect } from "vitest";
import { placeWorker } from "../../../services/moves/workerPlacementService";
// Register core actions used by the placement pipeline (discard, presence, etc.).
import "../../../actions/core-actions";
import { discardCost } from "../../../services/actions/requirements";
import { LocationActionsEnum, DistrictIconsEnum, ResourceEnum } from "../../../enums";
import { DEFAULT_MARKET_TIER } from "../../../constants";
import {
    makeCard,
    makeDistrict,
    makeGameState,
    makeLocation,
    makeMetaState,
    makePlayer,
} from "../factories";

describe("placeWorker — happy path", () => {
    it("plays the card, pays costs, collects rewards and claims the location", () => {
        const card = makeCard({
            id: "p",
            districtIds: [DistrictIconsEnum.D3],
            primaryResources: [{ resourceId: ResourceEnum.Candy, amount: 2 }],
        });
        const location = makeLocation({
            districtId: DistrictIconsEnum.D3,
            cost: { districtIconIds: [DistrictIconsEnum.D3], resources: [{ resourceId: ResourceEnum.Loot, amount: 1 }] },
            reward: {
                resources: [{ resourceId: ResourceEnum.Candy, amount: 1 }],
                actions: [{ actionId: LocationActionsEnum.GET_SWORD_MASTER, name: "Sword Master" }],
            },
        });
        const player = makePlayer({
            id: "0",
            hand: [card],
            cardsInPlay: [],
            candy: 5,
            loot: 5,
            currentNumberOfWorkers: 2,
            maxNumberOfWorkers: 2,
        });
        const state = makeMetaState({
            G: makeGameState({
                players: { "0": player },
                districts: [makeDistrict({ id: DistrictIconsEnum.D3, presence: {} })],
            }),
        });

        placeWorker({ mgState: state, player, location, card });

        // playCard: card discarded, primary resources applied, worker spent, flag set
        expect(player.hand).toEqual([]);
        expect(player.discardPile.map(c => c.id)).toContain("p");
        expect(player.hasPlayedCard).toBe(true);
        expect(player.cardsInPlay?.map(c => c.id)).toContain("p");
        // candy: 5 +2 (card) +1 (reward) = 8 ; loot: 5 -1 (cost) = 4
        expect(player[ResourceEnum.Candy]).toBe(8);
        expect(player[ResourceEnum.Loot]).toBe(4);
        // reward action getSwordMaster: -1 worker (played) then +1 = back to 2, max 3
        expect(player.currentNumberOfWorkers).toBe(2);
        expect(player.maxNumberOfWorkers).toBe(3);
        // claimLocation
        expect(location.isDisabled).toBe(true);
        expect(location.takenByPlayerID).toBe("0");
        expect(state.G.districts[0].presence["0"]).toEqual({ playerID: "0", amount: 1 });
    });
});

describe("placeWorker — cost actions via move params", () => {
    const buildScenario = (moveParams: any) => {
        const card = makeCard({ id: "p", districtIds: [DistrictIconsEnum.D3] });
        const extra = makeCard({ id: "e" });
        const location = makeLocation({
            districtId: DistrictIconsEnum.D3,
            cost: { districtIconIds: [DistrictIconsEnum.D3], actions: [discardCost(1)] },
            reward: {},
        });
        const player = makePlayer({ id: "0", hand: [card, extra] });
        const state = makeMetaState({
            G: makeGameState({ players: { "0": player }, districts: [makeDistrict({ id: DistrictIconsEnum.D3 })] }),
        });
        placeWorker({ mgState: state, player, location, card, moveParams });
        return player;
    };

    it("consumes the structured WorkerMoveParams.costParams", () => {
        const player = buildScenario({ costParams: { actionType: "discard", cardIds: ["e"] } });
        // both the played card and the cost-discarded extra end up in discard
        expect(player.hand).toEqual([]);
        expect(player.discardPile.map(c => c.id).sort()).toEqual(["e", "p"]);
    });

    it("accepts raw ActionParams as cost params (legacy path)", () => {
        const player = buildScenario({ actionType: "discard", cardIds: ["e"] });
        expect(player.hand).toEqual([]);
        expect(player.discardPile.map(c => c.id).sort()).toEqual(["e", "p"]);
    });
});

describe("placeWorker — reward actions via move params", () => {
    it("passes WorkerMoveParams.rewardParams to the reward action", () => {
        const card = makeCard({ id: "p", districtIds: [DistrictIconsEnum.D3] });
        const buyTarget = makeCard({ id: "buy", name: "Bought" });
        const location = makeLocation({
            districtId: DistrictIconsEnum.D3,
            cost: { districtIconIds: [DistrictIconsEnum.D3] },
            reward: { actions: [{ actionId: LocationActionsEnum.BUY_CARD, name: "buy" }] },
        });
        const player = makePlayer({ id: "0", hand: [card], discardPile: [] });
        const state = makeMetaState({
            G: makeGameState({
                players: { "0": player },
                districts: [makeDistrict({ id: DistrictIconsEnum.D3 })],
                markets: { [DEFAULT_MARKET_TIER]: [buyTarget, makeCard()] },
            }),
        });

        placeWorker({
            mgState: state,
            player,
            location,
            card,
            moveParams: { rewardParams: { actionType: "buyCard", targetCardId: "buy" } },
        });

        expect(player.discardPile.map(c => c.id)).toContain("buy");
        expect(state.G.markets[DEFAULT_MARKET_TIER].find(c => c.id === "buy")).toBeUndefined();
    });
});

describe("placeWorker — victory points and workers as cost/reward", () => {
    const runPlacement = (locationOverrides: Partial<Parameters<typeof makeLocation>[0]>, playerOverrides = {}) => {
        const card = makeCard({ id: "p", districtIds: [DistrictIconsEnum.D3] });
        const location = makeLocation({
            districtId: DistrictIconsEnum.D3,
            cost: { districtIconIds: [DistrictIconsEnum.D3] },
            reward: {},
            ...locationOverrides,
        });
        const player = makePlayer({ id: "0", hand: [card], ...playerOverrides });
        const state = makeMetaState({
            G: makeGameState({ players: { "0": player }, districts: [makeDistrict({ id: DistrictIconsEnum.D3 })] }),
        });
        placeWorker({ mgState: state, player, location, card });
        return { player, state };
    };

    it("pays a victory-point cost and logs it", () => {
        const { player, state } = runPlacement(
            { cost: { districtIconIds: [DistrictIconsEnum.D3], resources: [{ resourceId: ResourceEnum.VictoryPoints, amount: 1 }] } },
            { victoryPoints: 2 }
        );
        expect(player.victoryPoints).toBe(1);
        expect(state.G.log.some(e => e.message.includes("-1 VP"))).toBe(true);
    });

    it("collects a victory-point reward", () => {
        const { player } = runPlacement(
            { reward: { resources: [{ resourceId: ResourceEnum.VictoryPoints, amount: 2 }] } },
            { victoryPoints: 0 }
        );
        expect(player.victoryPoints).toBe(2);
    });

    it("collects a worker reward usable in the same round (max AND current rise)", () => {
        const { player } = runPlacement(
            { reward: { resources: [{ resourceId: ResourceEnum.Workers, amount: 1 }] } },
            { currentNumberOfWorkers: 2, maxNumberOfWorkers: 2 }
        );
        // playCard spent 1 worker (2→1), reward adds 1 back (1→2); max 2→3
        expect(player.maxNumberOfWorkers).toBe(3);
        expect(player.currentNumberOfWorkers).toBe(2);
    });

    it("pays a worker cost AFTER the placed worker was spent (order: playCard then payCosts)", () => {
        const { player } = runPlacement(
            { cost: { districtIconIds: [DistrictIconsEnum.D3], resources: [{ resourceId: ResourceEnum.Workers, amount: 1 }] } },
            { currentNumberOfWorkers: 1, maxNumberOfWorkers: 2 }
        );
        // playCard: current 1→0; workers cost: max 2→1, current clamped to min(0, 1) = 0
        expect(player.maxNumberOfWorkers).toBe(1);
        expect(player.currentNumberOfWorkers).toBe(0);
    });
});

describe("placeWorker — district not found", () => {
    it("still claims the location without crashing when the district is absent", () => {
        const card = makeCard({ id: "p", districtIds: ["UNKNOWN"] });
        const location = makeLocation({ districtId: "UNKNOWN", cost: { districtIconIds: ["UNKNOWN"] }, reward: {} });
        const player = makePlayer({ id: "0", hand: [card] });
        const state = makeMetaState({ G: makeGameState({ players: { "0": player }, districts: [] }) });

        expect(() => placeWorker({ mgState: state, player, location, card })).not.toThrow();
        expect(location.takenByPlayerID).toBe("0");
        expect(state.G.log.some(e => e.message.includes("claimed"))).toBe(true);
    });
});
