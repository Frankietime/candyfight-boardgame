import _ from "lodash";
import { RewardAction, MetaGameState } from "../../types";
import { actionRegistry } from "../../actions";
import { getCurrentPlayer } from "./helper";

export const checkInvalidActions = (mgState: MetaGameState, actions: RewardAction[]) => {
    const clonedState = _.cloneDeep(mgState);
    const player = getCurrentPlayer(clonedState);
    for (const action of actions) {
        const clonedAction = _.cloneDeep(action);
        actionRegistry.execute(clonedAction.actionId, clonedAction.params ?? {}, clonedState, player, { location: clonedAction.location });
    }
}