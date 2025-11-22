import { PhaseConfig } from "boardgame.io";
import { Stage } from "boardgame.io/core";
import { GameState } from "../types";
import { getPlayersList } from "../services/moves/playerServices";
import { log } from "../common-methods";
import { calculateCombatWinner } from "../game-helper";

export const combatPhase: PhaseConfig<GameState> = {
    next: ({ G }) => getPlayersList(G).some(p => p.victoryPoints >= 6) ? "endGamePhase" : "maintenancePhase",
    turn: {
        activePlayers: { all: Stage.NULL },
    },
    moves: {
        endRound: {
            move: ({ G }) => { G.roundEndingCounter += 1 }
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
}
