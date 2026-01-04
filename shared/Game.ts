import { Game as GameInterface } from "boardgame.io";
import { INVALID_MOVE, Stage } from "boardgame.io/core";
import { GAME_NAME } from "./constants";
import { Card, GameState, MetaGameState } from "./types";
import {
    districtsSetup,
    getInitialPlayersState,
    isWorkerPlacementValid,
    playersSetup,
    resetEndPhaseTriggers
} from "./game-helper";
import { getMarketTierOneCards } from "./services/cardServices";
import { getInitialDistrictsState } from "./services/locationServices";
import { draw, selectCard } from "./services/moves/moves";
import { placeWorker } from "./services/moves/workerPlacementService";
import {
    calculateRanking,
    dealHands,
    discardAllHands,
    resetTurnState,
    resolveCombat,
    revealPlayer
} from "./services/moves/phaseService";
import { playerView } from "./services/playerViewService";
import { getCurrentLocation, getCurrentPlayer } from "./services/moves/helper";
import { getPlayersList } from "./services/moves/playerServices";

export const Game: GameInterface<GameState> = {
    
    name: GAME_NAME,

    minPlayers: 2,
    maxPlayers: 4,
    
    setup: ({ ctx, ...plugins }) => ({
        players: getInitialPlayersState(ctx.numPlayers, plugins),
        districts: getInitialDistrictsState(),
        cardMarket: plugins.random.Shuffle([...getMarketTierOneCards()]),
        roundEndingCounter: 0,
        gameEndingCounter: 0,
        ranking: [],
        playersViewModel: [], // Will be populated by playerView
    }),

    playerView,

    phases: {
        maintenancePhase: {
            start: true,
            next: "mainPhase",
            endIf: ({ G }) => getPlayersList(G).every(player => player.hand.length === 5),
            onBegin: ({ G, random }) => {
                resetEndPhaseTriggers(G);
                playersSetup(G);
                districtsSetup(G);
                dealHands(G, random);
            }
        },
        mainPhase: {
            next: "combatPhase",
            endIf: ({ G }) => getPlayersList(G).every(p => p.hasRevealed),
            turn: {
                minMoves: 1,
                onBegin: (mgState: MetaGameState) => resetTurnState(getCurrentPlayer(mgState)),
                endIf: (mgState: MetaGameState) => getCurrentPlayer(mgState).hasRevealed
            },
            moves: {
                draw: {
                    move: (mgState: MetaGameState) => draw(getCurrentPlayer(mgState), mgState.random),
                    undoable: false
                },
                selectCard: {
                    move: (mgState: MetaGameState, selectedCard: Card) =>
                        selectCard(getCurrentPlayer(mgState), selectedCard),
                    undoable: true
                },    
                placeWorker: {
                    move: (
                        mgState: MetaGameState,
                        districtID: number,
                        locationID: number,
                        selectedCard: Card,
                        moveParams?: any
                    ) => {
                        const location = getCurrentLocation(mgState, districtID, locationID);
                        const player = getCurrentPlayer(mgState);

                        if (!isWorkerPlacementValid(player, location, selectedCard)) {
                            return INVALID_MOVE;
                        }

                        placeWorker({ mgState, player, location, card: selectedCard, moveParams });
                    },
                    undoable: true
                },
                reveal: {
                    move: (mgState: MetaGameState) => revealPlayer(getCurrentPlayer(mgState))
                }
            }
        },
        combatPhase: {
            next: ({ G }) => getPlayersList(G).some(p => p.victoryPoints >= 6) ? "endGamePhase" : "maintenancePhase",
            // TODO: add brief documentation from boardgame.io
            turn: { activePlayers: { all: Stage.NULL } },
            moves: {
                endRound: { move: ({ G }) => { G.roundEndingCounter += 1; } }
            },
            onBegin: ({ G }) => resolveCombat(G),
            onEnd: ({ G }) => discardAllHands(G),
            endIf: ({ G, ctx }) => G.roundEndingCounter >= ctx.numPlayers
        },
        endGamePhase: {
            onBegin: ({ G }) => calculateRanking(G),
            // TODO: add brief documentation from boardgame.io
            turn: { activePlayers: { all: Stage.NULL } },
            moves: {
                goToLobby: { move: ({ G }) => { G.gameEndingCounter += 1; } }
            },
            onEnd: ({ events }) => events.endGame()
        }
    },
    
    events: {
        // prevents player from ending a game
        endGame: false,
    },
    
    ai: {
        enumerate: (G, ctx) => {
            return [];
        },
    },
            
    endIf: (mgState) => mgState.G.gameEndingCounter >= mgState.ctx.numPlayers,
}