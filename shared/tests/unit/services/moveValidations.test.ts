import { describe, it, expect } from "vitest";
import { checkInvalidActions } from "../../../services/moves/moveValidations";
// Core actions must be registered for the registry execution to resolve.
import "../../../actions/core-actions";
import { LocationActionsEnum } from "../../../enums";
import { RewardAction } from "../../../types";
import { makeMetaState, makePlayer } from "../factories";

describe("checkInvalidActions", () => {
    it("runs actions against a deep clone, leaving the original state untouched", () => {
        const player = makePlayer({ id: "0", currentNumberOfWorkers: 1, maxNumberOfWorkers: 2 });
        const state = makeMetaState({ G: { ...makeMetaState().G, players: { "0": player } } });

        const actions: RewardAction[] = [
            { actionId: LocationActionsEnum.GET_SWORD_MASTER, name: "Sword Master" },
        ];
        checkInvalidActions(state, actions);

        // GET_SWORD_MASTER would mutate worker counts, but only on the clone.
        expect(player.currentNumberOfWorkers).toBe(1);
        expect(player.maxNumberOfWorkers).toBe(2);
    });

    it("handles an empty action list without throwing", () => {
        expect(() => checkInvalidActions(makeMetaState(), [])).not.toThrow();
    });

    it("tolerates actions with explicit params", () => {
        const state = makeMetaState();
        const actions: RewardAction[] = [
            { actionId: LocationActionsEnum.DRAW, name: "Draw", params: { count: 1 } },
        ];
        expect(() => checkInvalidActions(state, actions)).not.toThrow();
    });
});
