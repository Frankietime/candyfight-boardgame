import { PhaseConfig } from "boardgame.io";
import { GameState, PlayerViewModel } from "../types";
import { getPlayersList } from "../services/moves/playerServices";
import { log } from "../common-methods";
import { resetEndPhaseTriggers, playersSetup, districtsSetup } from "../game-helper";
import { draw } from "../services/moves/moves";

export const maintenancePhase: PhaseConfig<GameState> = {
    start: true,
    next: "mainPhase",
    endIf: ({ G }) => getPlayersList(G).every(player => player.hand.length == 5),
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
            log("player " + player.id + " hand: " + player.hand.length + " deck: " + player.deck.length + " discardPile: " + player.discardPile.length);
            draw(player, plugins.random, 5);
            log("player " + player.id + " hand: " + player.hand.length);
        });
    }
}
