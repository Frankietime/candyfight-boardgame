import { describe, it, expect } from "vitest";
import {
    addResources,
    canAffordResources,
    deductResources,
    getResourceAmount,
    resourceLabel,
} from "../../../services/resourceServices";
import { ResourceEnum } from "../../../enums";
import { makePlayer } from "../factories";

const bag = (resourceId: ResourceEnum, amount: number) => [{ resourceId, amount }];

describe("getResourceAmount", () => {
    it("reads candy, loot and victory points from their player fields", () => {
        const player = makePlayer({ candy: 3, loot: 2, victoryPoints: 4 });
        expect(getResourceAmount(player, ResourceEnum.Candy)).toBe(3);
        expect(getResourceAmount(player, ResourceEnum.Loot)).toBe(2);
        expect(getResourceAmount(player, ResourceEnum.VictoryPoints)).toBe(4);
    });

    it("reads workers as maxNumberOfWorkers (the permanent stat)", () => {
        const player = makePlayer({ currentNumberOfWorkers: 1, maxNumberOfWorkers: 3 });
        expect(getResourceAmount(player, ResourceEnum.Workers)).toBe(3);
    });
});

describe("addResources", () => {
    it("adds simple resources and victory points", () => {
        const player = makePlayer({ candy: 1, victoryPoints: 0 });
        addResources(player, [
            { resourceId: ResourceEnum.Candy, amount: 2 },
            { resourceId: ResourceEnum.VictoryPoints, amount: 1 },
        ]);
        expect(player.candy).toBe(3);
        expect(player.victoryPoints).toBe(1);
    });

    it("worker rewards raise max AND current (usable this round, like Sword Master)", () => {
        const player = makePlayer({ currentNumberOfWorkers: 1, maxNumberOfWorkers: 2 });
        addResources(player, bag(ResourceEnum.Workers, 1));
        expect(player.maxNumberOfWorkers).toBe(3);
        expect(player.currentNumberOfWorkers).toBe(2);
    });
});

describe("deductResources", () => {
    it("deducts simple resources and victory points", () => {
        const player = makePlayer({ loot: 5, victoryPoints: 3 });
        deductResources(player, [
            { resourceId: ResourceEnum.Loot, amount: 2 },
            { resourceId: ResourceEnum.VictoryPoints, amount: 1 },
        ]);
        expect(player.loot).toBe(3);
        expect(player.victoryPoints).toBe(2);
    });

    it("worker costs lower max and clamp current to the new max", () => {
        const player = makePlayer({ currentNumberOfWorkers: 3, maxNumberOfWorkers: 3 });
        deductResources(player, bag(ResourceEnum.Workers, 1));
        expect(player.maxNumberOfWorkers).toBe(2);
        expect(player.currentNumberOfWorkers).toBe(2);
    });

    it("worker costs never push counts below zero", () => {
        const player = makePlayer({ currentNumberOfWorkers: 0, maxNumberOfWorkers: 1 });
        deductResources(player, bag(ResourceEnum.Workers, 5));
        expect(player.maxNumberOfWorkers).toBe(0);
        expect(player.currentNumberOfWorkers).toBe(0);
    });
});

describe("canAffordResources", () => {
    it("gates on the resource amount", () => {
        const player = makePlayer({ candy: 2, victoryPoints: 1 });
        expect(canAffordResources(player, bag(ResourceEnum.Candy, 2))).toBe(true);
        expect(canAffordResources(player, bag(ResourceEnum.Candy, 3))).toBe(false);
        expect(canAffordResources(player, bag(ResourceEnum.VictoryPoints, 1))).toBe(true);
        expect(canAffordResources(player, bag(ResourceEnum.VictoryPoints, 2))).toBe(false);
    });

    it("worker costs must leave at least 1 permanent worker", () => {
        const two = makePlayer({ maxNumberOfWorkers: 2 });
        const one = makePlayer({ maxNumberOfWorkers: 1 });
        expect(canAffordResources(two, bag(ResourceEnum.Workers, 1))).toBe(true);
        expect(canAffordResources(one, bag(ResourceEnum.Workers, 1))).toBe(false);
        expect(canAffordResources(two, bag(ResourceEnum.Workers, 2))).toBe(false);
    });

    it("checks every bag in the list", () => {
        const player = makePlayer({ candy: 5, loot: 0 });
        expect(canAffordResources(player, [
            { resourceId: ResourceEnum.Candy, amount: 1 },
            { resourceId: ResourceEnum.Loot, amount: 1 },
        ])).toBe(false);
    });
});

describe("resourceLabel", () => {
    it("labels all four resource types", () => {
        expect(resourceLabel(ResourceEnum.Candy)).toBe("candy");
        expect(resourceLabel(ResourceEnum.Loot)).toBe("loot");
        expect(resourceLabel(ResourceEnum.VictoryPoints)).toBe("VP");
        expect(resourceLabel(ResourceEnum.Workers)).toBe("worker");
    });
});
