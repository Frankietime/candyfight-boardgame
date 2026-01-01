import { LocationMovesEnum } from "../../enums"
import { BoardMove, MetaGameState, PlayerPresence } from "../../types"
import { discard, draw, getLoot, trash } from "./moves"
import { getCurrentPlayer } from "./helper"
import { MoveFunction, MoveFunctionArgs } from "./types"  
import { isNullOrEmpty } from "../../common-methods"

export const locationMoves: { [key: string]: MoveFunction } = {
    [LocationMovesEnum.DRAW]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        
        draw(playerState, mgState.random, move.params.selectionNumber)
    },
    [LocationMovesEnum.ADD_PRESENCE_TOKEN]: ({ mgState, playerState, move, location }: MoveFunctionArgs) => {
        const district = mgState.G.districts.find(d => d.id == location!.districtId);
        if (district && !isNullOrEmpty(district.presence) && district.presence[playerState.id]) {
            district.presence[playerState.id].amount += 1;
        } else {
            district!.presence = {...district?.presence, [playerState.id]: {playerID: playerState.id, amount: 1}};            
        }
        // draw(playerState, mgState.random)
    },
    [LocationMovesEnum.GET_LOOT]: ({ mgState, playerState, move }: MoveFunctionArgs) => {

        getLoot(playerState)
    },
    [LocationMovesEnum.DISCARD]: ({ mgState, playerState, move }: MoveFunctionArgs) => {

        discard(playerState, move.params)
    }, 
    [LocationMovesEnum.TRASH]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        
        trash(playerState, move.params)
    },
    [LocationMovesEnum.ADD_REPAIR_TOKEN]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        
    },
    [LocationMovesEnum.ADVANCE_TRACKER]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        
    },
    [LocationMovesEnum.BUY_CARD]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        
    },
    [LocationMovesEnum.COOLDOWN]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        
    },
    [LocationMovesEnum.DEAL]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        
    },
    [LocationMovesEnum.GET_SWORD_MASTER]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        playerState.currentNumberOfWorkers += 1;
        playerState.maxNumberOfWorkers += 1;
        
    },
    [LocationMovesEnum.SIGNET_TRIGGER]: ({ mgState, playerState, move }: MoveFunctionArgs) => {
        
    },
}

export const executeMove = (mgState: MetaGameState, move: BoardMove) => {
    const playerState = getCurrentPlayer(mgState);
    locationMoves[move.moveId] ? locationMoves[move.moveId]({ mgState, playerState, move, location: move.location }) : null;
}