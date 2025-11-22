import { Game as GameInterface } from "boardgame.io";
import { PlayerView } from "boardgame.io/core";
import { GAME_NAME } from "./constants";
import { GameState, PlayerViewModel } from "./types";
import { getInitialPlayersState } from "./game-helper";
import { getInitialDistrictsState } from "./services/locationServices";
import { getMarketTierOneCards } from "./services/cardServices";
import { maintenancePhase } from "./phases/maintenance";
import { mainPhase } from "./phases/main";
import { combatPhase } from "./phases/combat";
import { endGamePhase } from "./phases/endGame";

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
        maintenancePhase,
        mainPhase,
        combatPhase,
        endGamePhase
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