import { Ctx, DefaultPluginAPIs, Game as GameInterface, PlayerID} from "boardgame.io";
import { ActivePlayers, INVALID_MOVE, PlayerView, Stage } from "boardgame.io/core";
import { GAME_NAME, NO_CARD_SELECTED } from "./constants";
import { BoardMove, GameState, Location, MetaGameState, PlayerGameState, PlayerViewModel } from "../shared/types";
import { 
    calculateCombatWinner,
    districtsSetup,
    getInitialPlayersState, 
    getInitialPlayersViewModel, 
    isPlayCardValid, 
    isWorkerPlacementValid, 
    playersSetup, 
    resetEndPhaseTriggers
} from "./game-helper";
import { LocationMovesEnum } from "./enums";
import { Card } from "../shared/types";
import { getMarketTierOneCards } from "../shared/services/cardServices";
import _, { get } from "lodash";

import { getInitialDistrictsState } from "./services/locationServices";
import { discard, draw, getLoot, selectCard } from "./services/moves/moves";
import { checlInvalidMoves } from "./services/moves/moveValidations";
import { executeMove, locationMoves } from "./services/moves/movesServices";
import { getCurrentLocation, getCurrentPlayer } from "./services/moves/helper";
import { getPlayersList } from "./services/moves/playerServices";
import { log } from "./common-methods";

export const Game: GameInterface<GameState> = {
    
    name: GAME_NAME,

    minPlayers: 2,
    maxPlayers: 4,
    
    setup: ({ ctx, ...plugins }, setupData) => ({
        players: getInitialPlayersState(ctx.numPlayers, plugins),
        playersViewModel: [] as PlayerViewModel[],
        districts: getInitialDistrictsState(),
        cardMarket: plugins.random.Shuffle([
            ...getMarketTierOneCards(),
        ]),
        roundEndingCounter: 0,
        gameEndingCounter: 0,
        ranking: []
    }),

    playerView: PlayerView.STRIP_SECRETS,

    phases: {
        maintenancePhase: {
            start: true,
            next: "mainPhase",
            endIf: ({ G, }) => getPlayersList(G).every(player => player.hand.length == 5),
            onBegin: ({ G, ctx, ...plugins }) => {
                console.log("**  **");
                log("MAINTENANCE", true);
                resetEndPhaseTriggers(G);
                playersSetup(G);
                districtsSetup(G);
                log();
                log("SET PLAYER PUBLIC INFO");

                // cada accion que updatea player tiene que updatear playersViewModel a traves de una funcion que filtra propiedades de player
                G.playersViewModel = getPlayersList(G).map<PlayerViewModel>(p => ({ 
                    id: p.id,
                    deckLength: p.deck.length,
                    discardPile: p.discardPile,
                    handLength: p.hand.length,
                    hasRevealed: false,
                    currentNumberOfWorkers: p.currentNumberOfWorkers,
                    trashPile: p.trashPile,
                    victoryPoints: p.victoryPoints,
                    candy: p.candy,
                    loot: p.loot,
                 }))
                log();
                log("HAND DEAL");
                log();
                getPlayersList(G).forEach(player => { 
                    log("player " + player.id + " hand: " + player.hand.length + " deck: " + player.deck.length + " discardPile: " + player.discardPile.length );
                    draw(player, plugins.random, 5);
                    log("player " + player.id + " hand: " + player.hand.length);
                });
            }
        },
        // Worker Placement & Reveal Phase
        mainPhase: {
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
                onEnd: ({ G, ctx, events, random, ...plugins }) => {},                
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
                            executeMove(mgState, {...selectedCard.primaryEffects!, params: { ...selectedCard.primaryEffects.params }, location: currentLocation });
                    
                        // update resources
                        playerState.currentNumberOfWorkers -= 1;
                        playerState.hasPlayedCard = true;
                        playerState.cardsInPlay?.push(selectedCard);
                        
                        currentLocation.cost.resources?.forEach(res => {
                            playerState[res.resourceId] -= res.amount;
                        })

                        currentLocation.cost.moves?.map(move => {
                            locationMoves[move.moveId]({ mgState, playerState, move: {...move, params: [...moveParams]}});
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
        },
        combatPhase: {
            next: ({ G }) => getPlayersList(G).some(p => p.victoryPoints >= 6) ? "endGamePhase" : "maintenancePhase",
            turn: {
                activePlayers: { all: Stage.NULL },  
            },
            moves: {
                endRound: {
                    move: ({ G }) => {G.roundEndingCounter += 1}
                }
            },
            onBegin: ({ G, events }) => {
                log("COMBAT PHASE", true);
                G.districts.forEach(d => {
                    d.combatWinnerId = calculateCombatWinner(d);
                    if (d.combatWinnerId) {
                        G.players[d.combatWinnerId].victoryPoints += 1;
                    }
                })
            },
            onEnd: ({ G, events }) => {
                getPlayersList(G).forEach(p => {
                    p.discardPile = [...p.discardPile, ...p.hand.map(c => c)];
                    p.hand = [];
                });
            },
            endIf: (mgState) => mgState.G.roundEndingCounter >= mgState.ctx.numPlayers
        },
        endGamePhase: {
            onBegin: ({ G }) => {
                
                // calculate players ranking
                G.ranking = getPlayersList(G).sort((a, b) => {
                    return (
                        (b.victoryPoints - a.victoryPoints) == 0 ? 
                        (b.candy - a.candy) == 0 ? 
                        (b.loot - a.loot)
                        : (b.victoryPoints - a.victoryPoints) 
                        : (b.candy - a.candy)
                    );
                });
            },
            turn: {
                activePlayers: { all: Stage.NULL }
            },
            moves: {
                goToLobby: {
                    move: ({ G }) => {G.gameEndingCounter += 1}
                }
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