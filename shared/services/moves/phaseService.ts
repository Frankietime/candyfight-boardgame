/**
 * Phase Service
 *
 * Functions for game phase transitions and lifecycle events.
 * Organized by the phase they're primarily used in:
 *
 * Maintenance Phase: dealHands
 * Main Phase: resetTurnState, revealPlayer
 * Combat Phase: resolveCombat, discardAllHands
 * End Game Phase: calculateRanking
 */

import { GameState, PlayerGameState } from "../../types";
import { NO_CARD_SELECTED } from "../../constants";
import { calculateCombatWinner } from "../../game-helper";
import { getPlayersList } from "./playerServices";
import { draw } from "./moves";

// ============================================================================
// MAINTENANCE PHASE
// ============================================================================

/**
 * Deals initial hands to all players.
 */
export const dealHands = (G: GameState, random: any): void => {
    getPlayersList(G).forEach(player => {
        draw(player, random, 5);
    });
};

// ============================================================================
// MAIN PHASE
// ============================================================================

/**
 * Resets a player's turn state at the start of their turn.
 */
export const resetTurnState = (player: PlayerGameState): void => {
    player.hasPlayedCard = false;
    player.selectedCard = NO_CARD_SELECTED;
};

/**
 * Marks a player as revealed.
 * The playerView filter will automatically expose this to other clients.
 */
export const revealPlayer = (player: PlayerGameState): void => {
    player.hasRevealed = true;
};

// ============================================================================
// COMBAT PHASE
// ============================================================================

/**
 * Resolves combat for all districts, awarding victory points to winners.
 */
export const resolveCombat = (G: GameState): void => {
    G.districts.forEach(district => {
        district.combatWinnerId = calculateCombatWinner(district);
        if (district.combatWinnerId) {
            G.players[district.combatWinnerId].victoryPoints += 1;
        }
    });
};

/**
 * Discards all players' hands to their discard piles.
 */
export const discardAllHands = (G: GameState): void => {
    getPlayersList(G).forEach(player => {
        player.discardPile = [...player.discardPile, ...player.hand];
        player.hand = [];
    });
};

// ============================================================================
// END GAME PHASE
// ============================================================================

/**
 * Calculates and sets the final player ranking.
 * Sorts by: victory points > candy > loot (descending).
 */
export const calculateRanking = (G: GameState): void => {
    G.ranking = getPlayersList(G).sort((a, b) => {
        if (b.victoryPoints !== a.victoryPoints) return b.victoryPoints - a.victoryPoints;
        if (b.candy !== a.candy) return b.candy - a.candy;
        return b.loot - a.loot;
    });
};
