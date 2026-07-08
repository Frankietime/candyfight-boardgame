import { describe, it, expect } from "vitest";
import {
    getInitialLocationsState,
    getInitialLocationCost,
    getInitialPlayersState,
    hasSelectedCard,
    isPlayCardValid,
    isWorkerPlacementValid,
    resetEndPhaseTriggers,
    playersSetup,
    districtsSetup,
    calculateCombatWinner,
} from "../../game-helper";
import { NO_CARD_SELECTED, INITIAL_NUMBER_OF_WORKERS } from "../../constants";
import { DistrictIconsEnum, ResourceEnum } from "../../enums";
import {
    identityRandom,
    makeCard,
    makeDistrict,
    makeGameState,
    makeLocation,
    makePlayer,
} from "./factories";

describe("getInitialLocationCost", () => {
    it("requires the district icon and one of each resource", () => {
        const cost = getInitialLocationCost(DistrictIconsEnum.D1);
        expect(cost.districtIconIds).toEqual([DistrictIconsEnum.D1]);
        expect(cost.resources).toEqual([
            { resourceId: ResourceEnum.Candy, amount: 1 },
            { resourceId: ResourceEnum.Loot, amount: 1 },
        ]);
    });
});

describe("getInitialLocationsState", () => {
    it("builds one location per name with index-suffixed ids", () => {
        const locs = getInitialLocationsState("Streets", DistrictIconsEnum.D3, ["A", "B"]);
        expect(locs).toHaveLength(2);
        expect(locs[0].Id).toBe("Streets-0");
        expect(locs[1].Id).toBe("Streets-1");
        expect(locs[0].districtId).toBe(DistrictIconsEnum.D3);
        expect(locs[0].isSelected).toBe(false);
        expect(locs[0].isDisabled).toBe(false);
    });
});

describe("getInitialPlayersState", () => {
    const plugins = { random: identityRandom } as any;

    it("creates a keyed entry per player with config resources and a shuffled deck", () => {
        const state = getInitialPlayersState(2, plugins, {
            numPlayers: 2,
            initialCandy: 7,
            initialLoot: 3,
            victoryPoints: 6,
        });
        expect(Object.keys(state)).toEqual(["0", "1"]);
        expect(state["0"][ResourceEnum.Candy]).toBe(7);
        expect(state["0"][ResourceEnum.Loot]).toBe(3);
        expect(state["0"].maxNumberOfWorkers).toBe(INITIAL_NUMBER_OF_WORKERS);
        expect(state["0"].selectedCard).toBe(NO_CARD_SELECTED);
        expect(state["0"].deck.length).toBeGreaterThan(0);
    });

    it("falls back to the default config when none is supplied", () => {
        const state = getInitialPlayersState(1, plugins);
        expect(state["0"][ResourceEnum.Candy]).toBe(2);
    });
});

describe("hasSelectedCard", () => {
    it("is false when no card or sentinel is selected", () => {
        expect(hasSelectedCard(makePlayer({ selectedCard: undefined }))).toBe(false);
        expect(hasSelectedCard(makePlayer({ selectedCard: NO_CARD_SELECTED }))).toBe(false);
    });

    it("is true when a real card is selected", () => {
        expect(hasSelectedCard(makePlayer({ selectedCard: makeCard() }))).toBe(true);
    });
});

describe("isPlayCardValid", () => {
    it("is valid when card not yet played and a real card id is given", () => {
        expect(isPlayCardValid(makePlayer({ hasPlayedCard: false }), "real-card")).toBe(true);
    });

    it("is invalid once a card has been played", () => {
        expect(isPlayCardValid(makePlayer({ hasPlayedCard: true }), "real-card")).toBe(false);
    });

    it("is invalid with the no-card sentinel", () => {
        expect(isPlayCardValid(makePlayer(), NO_CARD_SELECTED as any)).toBe(false);
    });
});

describe("isWorkerPlacementValid", () => {
    const card = makeCard({ districtIds: [DistrictIconsEnum.D3] });
    const location = makeLocation({
        cost: { districtIconIds: [DistrictIconsEnum.D3], resources: [] },
        takenByPlayerID: undefined,
    });

    it("is valid for a fresh player with a matching card and free location", () => {
        expect(isWorkerPlacementValid(makePlayer(), location, card)).toBe(true);
    });

    it("is invalid when the player already played a card", () => {
        expect(isWorkerPlacementValid(makePlayer({ hasPlayedCard: true }), location, card)).toBe(false);
    });

    it("is invalid with no workers left", () => {
        expect(isWorkerPlacementValid(makePlayer({ currentNumberOfWorkers: 0 }), location, card)).toBe(false);
    });

    it("is invalid when the location is taken", () => {
        const taken = makeLocation({ ...location, takenByPlayerID: "1" });
        expect(isWorkerPlacementValid(makePlayer(), taken, card)).toBe(false);
    });

    it("is invalid when the card lacks the location's district icon", () => {
        const wrongCard = makeCard({ districtIds: [DistrictIconsEnum.D1] });
        expect(isWorkerPlacementValid(makePlayer(), location, wrongCard)).toBe(false);
    });

    it("is invalid when the player cannot pay resource costs", () => {
        const costly = makeLocation({
            cost: {
                districtIconIds: [DistrictIconsEnum.D3],
                resources: [{ resourceId: ResourceEnum.Candy, amount: 999 }],
            },
        });
        expect(isWorkerPlacementValid(makePlayer({ candy: 1 }), costly, card)).toBe(false);
    });
});

describe("resetEndPhaseTriggers", () => {
    it("resets the round counter and clears all reveal flags", () => {
        const G = makeGameState({
            roundEndingCounter: 3,
            players: {
                "0": makePlayer({ id: "0", hasRevealed: true }),
                "1": makePlayer({ id: "1", hasRevealed: true }),
            },
        });
        resetEndPhaseTriggers(G);
        expect(G.roundEndingCounter).toBe(0);
        expect(G.players["0"].hasRevealed).toBe(false);
        expect(G.players["1"].hasRevealed).toBe(false);
    });
});

describe("playersSetup", () => {
    it("refills current workers to the player's max", () => {
        const G = makeGameState({
            players: { "0": makePlayer({ currentNumberOfWorkers: 0, maxNumberOfWorkers: 3 }) },
        });
        playersSetup(G);
        expect(G.players["0"].currentNumberOfWorkers).toBe(3);
    });
});

describe("districtsSetup", () => {
    it("clears winners, presence, and per-location flags", () => {
        const G = makeGameState({
            districts: [
                makeDistrict({
                    combatWinnerId: "0",
                    presence: { "0": { playerID: "0", amount: 2 } },
                    locations: [makeLocation({ isDisabled: true, isSelected: true, takenByPlayerID: "0" })],
                }),
            ],
        });
        districtsSetup(G);
        const d = G.districts[0];
        expect(d.combatWinnerId).toBeUndefined();
        expect(d.presence).toEqual({});
        expect(d.locations[0].isDisabled).toBe(false);
        expect(d.locations[0].isSelected).toBe(false);
        expect(d.locations[0].takenByPlayerID).toBeUndefined();
    });
});

describe("calculateCombatWinner", () => {
    it("returns undefined when there is no presence", () => {
        expect(calculateCombatWinner(makeDistrict({ presence: {} }))).toBeUndefined();
    });

    it("returns the only contender when a single player has presence", () => {
        const d = makeDistrict({ presence: { "0": { playerID: "0", amount: 1 } } });
        expect(calculateCombatWinner(d)).toBe("0");
    });

    it("returns the strict leader when amounts differ", () => {
        const d = makeDistrict({
            presence: {
                "0": { playerID: "0", amount: 3 },
                "1": { playerID: "1", amount: 1 },
            },
        });
        expect(calculateCombatWinner(d)).toBe("0");
    });

    it("returns undefined on a tie for first place", () => {
        const d = makeDistrict({
            presence: {
                "0": { playerID: "0", amount: 2 },
                "1": { playerID: "1", amount: 2 },
            },
        });
        expect(calculateCombatWinner(d)).toBeUndefined();
    });
});
