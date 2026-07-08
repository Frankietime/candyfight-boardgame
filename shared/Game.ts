import { Game as GameInterface } from "boardgame.io";
import { INVALID_MOVE, Stage, TurnOrder } from "boardgame.io/core";
import { GAME_NAME } from "./constants";
import { Card, GameConfig, GameState, MetaGameState, DEFAULT_GAME_CONFIG } from "./types";
import { CharacterEnum } from "./enums";
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
import { placeWorker, validatePlacementActions } from "./services/moves/workerPlacementService";
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
import { appendLog } from "./services/logService";
import { enumerate } from "./ai/botEnumerate";

export const Game: GameInterface<GameState> = {
    
    name: GAME_NAME,

    minPlayers: 2,
    maxPlayers: 4,
    
    setup: ({ ctx, ...plugins }, setupData) => {
        const config: GameConfig = {
            ...DEFAULT_GAME_CONFIG,
            ...(setupData ?? {}),
            numPlayers: ctx.numPlayers,
        };
        return {
            players: getInitialPlayersState(ctx.numPlayers, plugins, config),
            districts: getInitialDistrictsState(),
            cardMarket: plugins.random.Shuffle([...getMarketTierOneCards()]),
            roundEndingCounter: 0,
            gameEndingCounter: 0,
            ranking: [],
            playersViewModel: [],
            config,
            log: [],
        };
    },

    playerView,

    phases: {
        characterSelectionPhase: {
            start: true,
            next: "maintenancePhase",
            endIf: ({ G }) => {
                const players = getPlayersList(G);
                return players.length > 0 && players.every(p => p.characterId !== undefined);
            },
            // maxMoves removes a seat from activePlayers after its one move, so
            // bot drivers (Local({ bots }) master loop) advance to the next seat
            // instead of re-asking a seat that already acted.
            turn: { activePlayers: { all: Stage.NULL, maxMoves: 1 } },
            moves: {
                selectCharacter: {
                    move: (mgState: MetaGameState, characterId: CharacterEnum) => {
                        // With activePlayers, mgState.playerID is the acting player.
                        // ctx.currentPlayer is the turn player (always "0") — wrong here.
                        const actingPlayerID = mgState.playerID ?? mgState.ctx.currentPlayer;
                        const player = mgState.G.players[actingPlayerID];
                        if (!player || player.characterId) return INVALID_MOVE;
                        const taken = getPlayersList(mgState.G)
                            .map(p => p.characterId)
                            .filter(Boolean);
                        if (taken.includes(characterId)) return INVALID_MOVE;
                        player.characterId = characterId;
                        appendLog(mgState.G, {
                            playerID: actingPlayerID,
                            phase: mgState.ctx.phase ?? '',
                            type: 'move',
                            message: `chose ${characterId}`,
                        });
                    },
                    undoable: false
                }
            }
        },
        maintenancePhase: {
            next: "mainPhase",
            // A player whose whole collection is smaller than 5 can never refill
            // to a full hand — "drew everything they own" (deck and discard
            // both empty) counts as dealt too, otherwise this phase never ends
            // and the game freezes.
            endIf: ({ G }) => getPlayersList(G).every(player =>
                player.hand.length === 5 ||
                (player.deck.length === 0 && player.discardPile.length === 0)
            ),
            onBegin: ({ G, random }) => {
                resetEndPhaseTriggers(G);
                playersSetup(G);
                districtsSetup(G);
                dealHands(G, random);
                appendLog(G, { playerID: '', phase: 'maintenancePhase', type: 'phase', message: '— New round begins —' });
            }
        },
        mainPhase: {
            next: "combatPhase",
            endIf: ({ G }) => getPlayersList(G).every(p => p.hasRevealed),
            turn: {
                minMoves: 1,
                onBegin: (mgState: MetaGameState) => {
                    // First turn of this round's mainPhase (cleared each
                    // maintenance) → this seat is the round's first player.
                    if (!mgState.G.firstPlayerID) {
                        mgState.G.firstPlayerID = mgState.ctx.currentPlayer;
                    }
                    resetTurnState(getCurrentPlayer(mgState));
                },
                endIf: (mgState: MetaGameState) => getCurrentPlayer(mgState).hasRevealed,
                order: {
                    first: TurnOrder.DEFAULT.first,
                    next: ({ G, ctx }: { G: GameState, ctx: any }) => {
                        for (let i = 1; i <= ctx.numPlayers; i++) {
                            const pos = (ctx.playOrderPos + i) % ctx.numPlayers;
                            const playerID = ctx.playOrder[pos];
                            if (!G.players[playerID]?.hasRevealed) {
                                return pos;
                            }
                        }
                        return undefined; // all revealed; phase.endIf will transition
                    }
                }
            },
            moves: {
                draw: {
                    move: (mgState: MetaGameState) => {
                        draw(getCurrentPlayer(mgState), mgState.random);
                        appendLog(mgState.G, {
                            playerID: mgState.ctx.currentPlayer,
                            phase: mgState.ctx.phase ?? '',
                            type: 'move',
                            message: 'drew a card',
                        });
                    },
                    undoable: false
                },
                selectCard: {
                    move: (mgState: MetaGameState, selectedCard: Card) => {
                        const result = selectCard(getCurrentPlayer(mgState), selectedCard);
                        return result;
                    },
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

                        // Reject before mutating if any cost/reward action can't
                        // actually run (e.g. missing/invalid cardIds) — otherwise
                        // the registry silently no-ops and the location would be
                        // claimed without paying (illegal free claim).
                        if (validatePlacementActions(mgState, player, location, selectedCard, moveParams) !== null) {
                            return INVALID_MOVE;
                        }

                        placeWorker({ mgState, player, location, card: selectedCard, moveParams });
                    },
                    undoable: true
                },
                reveal: {
                    move: (mgState: MetaGameState) => {
                        revealPlayer(getCurrentPlayer(mgState));
                        appendLog(mgState.G, {
                            playerID: mgState.ctx.currentPlayer,
                            phase: mgState.ctx.phase ?? '',
                            type: 'move',
                            message: 'revealed',
                        });
                        mgState.events?.endTurn?.();
                    }
                },
                pass: {
                    move: (mgState: MetaGameState) => {
                        if (!getCurrentPlayer(mgState).hasPlayedCard) return INVALID_MOVE;
                        appendLog(mgState.G, {
                            playerID: mgState.ctx.currentPlayer,
                            phase: mgState.ctx.phase ?? '',
                            type: 'move',
                            message: 'passed',
                        });
                        mgState.events?.endTurn?.();
                    },
                    undoable: false
                }
            }
        },
        combatPhase: {
            next: ({ G }) => getPlayersList(G).some(p => p.victoryPoints >= G.config.victoryPoints) ? "endGamePhase" : "maintenancePhase",
            // maxMoves: one endRound per seat — also stops a single seat from
            // spamming the counter and skipping everyone else's combat review.
            turn: { activePlayers: { all: Stage.NULL, maxMoves: 1 } },
            moves: {
                endRound: { move: ({ G }) => { G.roundEndingCounter += 1; } }
            },
            onBegin: ({ G, ctx }) => resolveCombat(G, ctx.phase ?? 'combatPhase'),
            onEnd: ({ G }) => discardAllHands(G),
            endIf: ({ G, ctx }) => G.roundEndingCounter >= ctx.numPlayers
        },
        endGamePhase: {
            onBegin: ({ G, ctx }) => calculateRanking(G, ctx.phase ?? 'endGamePhase'),
            turn: { activePlayers: { all: Stage.NULL, maxMoves: 1 } },
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
        enumerate: (G, ctx, playerID) => enumerate(G, ctx, playerID),
    },
            
    endIf: (mgState) => mgState.G.gameEndingCounter >= mgState.ctx.numPlayers,
}