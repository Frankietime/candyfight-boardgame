import { PhaseConfig } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/core";
import { GameState, MetaGameState, Card, Location } from "../types";
import { getCurrentPlayer, getCurrentLocation } from "../services/moves/helper";
import { NO_CARD_SELECTED } from "../constants";
import { draw, selectCard, discard } from "../services/moves/moves";
import { isWorkerPlacementValid } from "../services/validation/Validator";
import { checlInvalidMoves } from "../services/moves/moveValidations";
import { executeMove, locationMoves } from "../services/moves/movesServices";
import { log } from "../common-methods";

export const mainPhase: PhaseConfig<GameState> = {
    next: "combatPhase",
    endIf: ({ G }) => Object.keys(G.players).every(key => G.players[key].hasRevealed),
    onBegin: (context) => {
        log("MAIN", true);
    },
    turn: {
        // play or reveal
        minMoves: 1,
        onBegin: (mgState: MetaGameState) => {
            // reset player state
            const playerState = getCurrentPlayer(mgState);
            playerState.hasPlayedCard = false;
            playerState.selectedCard = NO_CARD_SELECTED;

        },
        onEnd: ({ G, ctx, events, random, ...plugins }) => { },
        // end if no workers left, stage?
        endIf: (mgState) => getCurrentPlayer(mgState).hasRevealed
    },
    moves: {
        draw: {
            move: (mgState: MetaGameState) => draw(getCurrentPlayer(mgState), mgState.random),
            undoable: false
        },
        selectCard: {
            move: (
                mgState: MetaGameState,
                gameState: GameState,
                selectedCard: Card
            ) => selectCard(getCurrentPlayer(mgState), selectedCard),
            undoable: true
        },
        placeWorker: {
            move: (
                mgState: MetaGameState,
                gameState: GameState,
                districtID: number,
                locationID: number,
                selectedCard: Card,
                moveParams: any
            ) => {

                const currentLocation: Location = getCurrentLocation(mgState, districtID, locationID);
                const playerState = getCurrentPlayer(mgState);

                if (!isWorkerPlacementValid(playerState, currentLocation, selectedCard))
                    return INVALID_MOVE;

                if (currentLocation.cost?.moves && currentLocation.cost.moves.length > 0) {
                    checlInvalidMoves(mgState, currentLocation.cost.moves);
                }

                // play card
                const playedCard = discard(playerState, [selectedCard]);

                // playerState.discardPile.push(playedCard[0] as Card);

                if (selectedCard.primaryEffects)
                    executeMove(mgState, { ...selectedCard.primaryEffects!, params: { ...selectedCard.primaryEffects.params }, location: currentLocation });

                // update resources
                playerState.currentNumberOfWorkers -= 1;
                playerState.hasPlayedCard = true;
                playerState.cardsInPlay?.push(selectedCard);

                currentLocation.cost.resources?.forEach(res => {
                    playerState[res.resourceId] -= res.amount;
                })

                currentLocation.cost.moves?.map(move => {
                    locationMoves[move.moveId]({ mgState, playerState, move: { ...move, params: [...moveParams] } });
                });

                currentLocation.reward.resources?.forEach(res => {
                    playerState[res.resourceId] += res.amount;
                });

                currentLocation.reward.moves?.forEach(move => {
                    locationMoves[move.moveId]({ mgState, playerState, move, location: currentLocation });
                })

                // update district & location
                currentLocation.isDisabled = true;
                currentLocation.isSelected = true;
                currentLocation.takenByPlayerID = mgState.ctx.currentPlayer;
                mgState.G.districts.forEach(d => {
                    if (d.id == currentLocation.districtId)
                        d.presence[playerState.id] = {
                            playerID: playerState.id,
                            amount: d.presence && d.presence[playerState.id] ? d.presence[playerState.id].amount + 1 : 1
                        };

                });
            },
            undoable: true
        },
        reveal: {
            move: (mgState) => {
                const player = getCurrentPlayer(mgState);
                mgState.G.playersViewModel[parseInt(player.id)].hasRevealed = player.hasRevealed = true
            }
        }
    },
    onEnd: (context) => {
    },
}
