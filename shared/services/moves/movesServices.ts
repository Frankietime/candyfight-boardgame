import { LocationMovesEnum } from "../../enums"
import { BoardMove, MetaGameState } from "../../types"
import { addRepairToken, advanceTracker, buyCard, cooldown, deal, discard, draw, getLoot, signetTrigger, trash } from "./moves"
import { getCurrentPlayer } from "./helper"
import { MoveFunction, MoveFunctionArgs } from "./types"
import { isNullOrEmpty } from "../../common-methods"

export const locationMoves: { [key: string]: MoveFunction } = {
    [LocationMovesEnum.DRAW]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        // Cast to any because we know the structure based on moveId, but the generic type is BoardMove
        const params = (move as any).params;
        draw(playerState, mgState.random, params?.selectionNumber)
    },
    [LocationMovesEnum.ADD_PRESENCE_TOKEN]: ({ mgState, playerState, move, location }: MoveFunctionArgs) => {
        const district = mgState.G.districts.find(d => d.id == location!.districtId);
        if (district && !isNullOrEmpty(district.presence) && district.presence[playerState.id]) {
            district.presence[playerState.id].amount += 1;
        } else {
            district!.presence = { ...district?.presence, [playerState.id]: { playerID: playerState.id, amount: 1 } };
        }
        // draw(playerState, mgState.random)
    },
    [LocationMovesEnum.GET_LOOT]: ({ mgState, playerState, move }: MoveFunctionArgs) => {

        getLoot(playerState)
    },
    [LocationMovesEnum.DISCARD]: ({ mgState, playerState, move }: MoveFunctionArgs) => {

        discard(playerState, (move as any).params)
    },
    [LocationMovesEnum.TRASH]: ({ mgState, playerState, move }: MoveFunctionArgs) => {

        trash(playerState, (move as any).params)
    },
    [LocationMovesEnum.ADD_REPAIR_TOKEN]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        addRepairToken(playerState);
    },
    [LocationMovesEnum.ADVANCE_TRACKER]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        advanceTracker(playerState);
    },
    [LocationMovesEnum.BUY_CARD]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        const params = (move as any).params;
        buyCard(playerState, mgState.G.cardMarket, params.cardId);
    },
    [LocationMovesEnum.COOLDOWN]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        cooldown(playerState);
    },
    [LocationMovesEnum.DEAL]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        deal(playerState);
    },
    [LocationMovesEnum.GET_SWORD_MASTER]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        playerState.currentNumberOfWorkers += 1;
        playerState.maxNumberOfWorkers += 1;

    },
    [LocationMovesEnum.SIGNET_TRIGGER]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        signetTrigger(playerState);
    },
    [LocationMovesEnum.STRANGE_CANDY_PUZZLE]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        // TODO: Implement
    },
    [LocationMovesEnum.SELECT_AND_DISCARD]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        // TODO: Implement
    },
}

export const executeMove = (mgState: MetaGameState, move: BoardMove) => {
    const playerState = getCurrentPlayer(mgState);
    locationMoves[move.moveId] ? locationMoves[move.moveId]({ mgState, playerState, move, location: move.location }) : null;
}