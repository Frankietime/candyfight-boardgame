import { describe, it, expect } from "vitest";
import {
    isDiscardParams,
    isTrashParams,
    isDrawParams,
    isBuyCardParams,
    createParams,
    ActionParams,
} from "../../../actions/action-params";

describe("action param type guards", () => {
    const draw: ActionParams = { actionType: "draw", count: 1 };
    const discard: ActionParams = { actionType: "discard", cardIds: ["a"] };
    const trash: ActionParams = { actionType: "trash", cardIds: ["a"] };
    const buy: ActionParams = { actionType: "buyCard", targetCardId: "c1" };

    it("isDrawParams only matches draw", () => {
        expect(isDrawParams(draw)).toBe(true);
        expect(isDrawParams(discard)).toBe(false);
    });

    it("isDiscardParams only matches discard", () => {
        expect(isDiscardParams(discard)).toBe(true);
        expect(isDiscardParams(draw)).toBe(false);
    });

    it("isTrashParams only matches trash", () => {
        expect(isTrashParams(trash)).toBe(true);
        expect(isTrashParams(discard)).toBe(false);
    });

    it("isBuyCardParams only matches buyCard", () => {
        expect(isBuyCardParams(buy)).toBe(true);
        expect(isBuyCardParams(draw)).toBe(false);
    });
});

describe("createParams builders", () => {
    it("builds each typed param shape", () => {
        expect(createParams.draw(2)).toEqual({ actionType: "draw", count: 2 });
        expect(createParams.discard(["a", "b"])).toEqual({ actionType: "discard", cardIds: ["a", "b"] });
        expect(createParams.trash(["c"])).toEqual({ actionType: "trash", cardIds: ["c"] });
        expect(createParams.buyCard("x")).toEqual({ actionType: "buyCard", targetCardId: "x" });
        expect(createParams.addPresenceToken("LOC1")).toEqual({ actionType: "addPresenceToken", districtId: "LOC1" });
        expect(createParams.addPresenceToken()).toEqual({ actionType: "addPresenceToken", districtId: undefined });
        expect(createParams.getSwordMaster()).toEqual({ actionType: "getSwordMaster" });
        expect(createParams.advanceTracker()).toEqual({ actionType: "advanceTracker" });
        expect(createParams.deal()).toEqual({ actionType: "deal" });
    });
});
