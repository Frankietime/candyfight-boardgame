import { describe, it, expect } from "vitest";
import {
    cardsInHandRequirement,
    canPayLocationCosts,
    discardCost,
    trashCost,
} from "../../../services/actions/requirements";
import { LocationActionsEnum, RequirementType, ResourceEnum } from "../../../enums";
import { makeCard, makeLocation, makePlayer } from "../factories";

describe("cardsInHandRequirement", () => {
    it("builds a CARDS_IN_HAND requirement with a count", () => {
        expect(cardsInHandRequirement(2)).toEqual({
            type: RequirementType.CARDS_IN_HAND,
            params: { count: 2 },
        });
    });
});

describe("discardCost / trashCost", () => {
    it("discardCost wires a discard action with a cards-in-hand requirement", () => {
        const cost = discardCost(2);
        expect(cost.actionId).toBe(LocationActionsEnum.DISCARD);
        expect(cost.params).toEqual({ selectionNumber: 2 });
        expect(cost.requirements[0]).toEqual(cardsInHandRequirement(2));
    });

    it("trashCost wires a trash action with a cards-in-hand requirement", () => {
        const cost = trashCost(3);
        expect(cost.actionId).toBe(LocationActionsEnum.TRASH);
        expect(cost.requirements[0].params.count).toBe(3);
    });
});

describe("canPayLocationCosts", () => {
    it("is true when there are no costs", () => {
        const loc = makeLocation({ cost: { districtIconIds: [] } });
        expect(canPayLocationCosts(makePlayer(), loc)).toBe(true);
    });

    it("checks resource costs against player balances", () => {
        const loc = makeLocation({
            cost: { districtIconIds: [], resources: [{ resourceId: ResourceEnum.Candy, amount: 4 }] },
        });
        expect(canPayLocationCosts(makePlayer({ candy: 4 }), loc)).toBe(true);
        expect(canPayLocationCosts(makePlayer({ candy: 3 }), loc)).toBe(false);
    });

    it("validates cards-in-hand action costs, excluding the played card", () => {
        const loc = makeLocation({ cost: { districtIconIds: [], actions: [discardCost(2)] } });
        const player = makePlayer({ hand: [makeCard(), makeCard(), makeCard()] });
        const selectedCard = makeCard();

        // 3 in hand minus the played card = 2 available → meets discard(2)
        expect(canPayLocationCosts(player, loc, selectedCard)).toBe(true);

        // Without playing a card, 3 available still meets the requirement
        expect(canPayLocationCosts(player, loc)).toBe(true);

        // Only 2 in hand minus the played card = 1 available → fails discard(2)
        const thin = makePlayer({ hand: [makeCard(), makeCard()] });
        expect(canPayLocationCosts(thin, loc, selectedCard)).toBe(false);
    });

    it("gates victory-point costs on the player's VP balance", () => {
        const loc = makeLocation({
            cost: { districtIconIds: [], resources: [{ resourceId: ResourceEnum.VictoryPoints, amount: 2 }] },
        });
        expect(canPayLocationCosts(makePlayer({ victoryPoints: 2 }), loc)).toBe(true);
        expect(canPayLocationCosts(makePlayer({ victoryPoints: 1 }), loc)).toBe(false);
    });

    it("gates worker costs so at least 1 permanent worker remains", () => {
        const loc = makeLocation({
            cost: { districtIconIds: [], resources: [{ resourceId: ResourceEnum.Workers, amount: 1 }] },
        });
        expect(canPayLocationCosts(makePlayer({ maxNumberOfWorkers: 2 }), loc)).toBe(true);
        expect(canPayLocationCosts(makePlayer({ maxNumberOfWorkers: 1 }), loc)).toBe(false);
    });

    it("treats non-cards-in-hand requirement types as satisfied", () => {
        const loc = makeLocation({
            cost: {
                districtIconIds: [],
                actions: [
                    {
                        actionId: LocationActionsEnum.DRAW,
                        name: "x",
                        params: {},
                        requirements: [{ type: RequirementType.RESOURCE, params: { count: 99 } }],
                    },
                ],
            },
        });
        expect(canPayLocationCosts(makePlayer(), loc)).toBe(true);
    });
});
