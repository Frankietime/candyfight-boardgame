import { describe, it, expect } from "vitest";
import { resources, actions, effects } from "../../../actions/effect-factories";
import { LocationActionsEnum, ResourceEnum } from "../../../enums";

describe("resource factories", () => {
    it("default loot/candy to amount 1", () => {
        expect(resources.loot()).toEqual({ resourceId: ResourceEnum.Loot, amount: 1 });
        expect(resources.candy()).toEqual({ resourceId: ResourceEnum.Candy, amount: 1 });
    });

    it("respect an explicit amount", () => {
        expect(resources.loot(3).amount).toBe(3);
        expect(resources.candy(2).amount).toBe(2);
    });

    it("default victoryPoints/workers to amount 1 and respect an explicit amount", () => {
        expect(resources.victoryPoints()).toEqual({ resourceId: ResourceEnum.VictoryPoints, amount: 1 });
        expect(resources.workers()).toEqual({ resourceId: ResourceEnum.Workers, amount: 1 });
        expect(resources.victoryPoints(2).amount).toBe(2);
        expect(resources.workers(3).amount).toBe(3);
    });
});

describe("action factories", () => {
    it("draw defaults to count 1 and respects override", () => {
        expect(actions.draw()).toEqual({ actionId: LocationActionsEnum.DRAW, name: "Draw", params: { count: 1 } });
        expect(actions.draw(2).params).toEqual({ count: 2 });
    });

    it("paramless actions carry only id and name", () => {
        expect(actions.addPresence()).toEqual({ actionId: LocationActionsEnum.ADD_PRESENCE_TOKEN, name: "Fight!" });
        expect(actions.getSwordMaster().actionId).toBe(LocationActionsEnum.GET_SWORD_MASTER);
        expect(actions.advanceTracker().actionId).toBe(LocationActionsEnum.ADVANCE_TRACKER);
        expect(actions.strangeCandyPuzzle().actionId).toBe(LocationActionsEnum.STRANGE_CANDY_PUZZLE);
        expect(actions.cooldown().actionId).toBe(LocationActionsEnum.COOLDOWN);
        expect(actions.signetTrigger().actionId).toBe(LocationActionsEnum.SIGNET_TRIGGER);
        expect(actions.deal().actionId).toBe(LocationActionsEnum.DEAL);
        expect(actions.addRepairToken().actionId).toBe(LocationActionsEnum.ADD_REPAIR_TOKEN);
    });

    it("buyCard omits params without a target and includes them with one", () => {
        expect(actions.buyCard().params).toBeUndefined();
        expect(actions.buyCard("c1").params).toEqual({ targetCardId: "c1" });
    });
});

describe("effects barrel", () => {
    it("re-exports both factory groups", () => {
        expect(effects.resources).toBe(resources);
        expect(effects.actions).toBe(actions);
    });
});
