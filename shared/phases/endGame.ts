import { PhaseConfig } from "boardgame.io";
import { Stage } from "boardgame.io/core";
import { GameState } from "../types";
import { getPlayersList } from "../services/moves/playerServices";

export const endGamePhase: PhaseConfig<GameState> = {
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
            move: ({ G }) => { G.gameEndingCounter += 1 }
        }
    },
    onEnd: ({ events }) => events.endGame()
}
