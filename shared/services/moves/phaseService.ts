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

import { GameState, MetaGameState, PlayerGameState } from "../../types";
import { HAND_SIZE, NO_CARD_SELECTED } from "../../constants";
import { LocationActionsEnum } from "../../enums";
import { calculateCombatWinner } from "../../game-helper";
import { getPlayersList } from "./playerServices";
import { draw } from "./moves";
import { appendLog, formatResources } from "../logService";
import { addResources } from "../resourceServices";
import { actionRegistry } from "../../actions";

// ============================================================================
// MAINTENANCE PHASE
// ============================================================================

/**
 * Deals initial hands to all players.
 */
export const dealHands = (G: GameState, random: any): void => {
    getPlayersList(G).forEach(player => {
        draw(player, random, HAND_SIZE);
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

/**
 * Fires the reveal (secondary) effects of every card the player played this
 * round, in play order: secondaryResources are added directly; each
 * secondaryEffect runs through the action registry. "+1 Fight" targets the
 * district where its card was played (playedDistrictId stamped by playCard).
 */
export const executeRevealEffects = (mgState: MetaGameState, player: PlayerGameState): void => {
    (player.cardsInPlay ?? []).forEach(card => {
        if (card.secondaryResources?.length) {
            addResources(player, card.secondaryResources);
            appendLog(mgState.G, {
                playerID: player.id,
                phase: mgState.ctx.phase ?? '',
                type: 'effect',
                message: `${card.name}: gained ${formatResources(card.secondaryResources)} (reveal)`,
                card,
            });
        }
        card.secondaryEffects?.forEach(effect => {
            const params =
                effect.actionId === LocationActionsEnum.ADD_PRESENCE_TOKEN
                    ? { ...(effect.params ?? {}), districtId: (effect.params as any)?.districtId ?? card.playedDistrictId }
                    : (effect.params ?? {});
            actionRegistry.execute(effect.actionId, params, mgState, player, {});
            appendLog(mgState.G, {
                playerID: player.id,
                phase: mgState.ctx.phase ?? '',
                type: 'effect',
                message: `${card.name}: ${effect.name} (reveal)`,
                card,
            });
        });
    });
};

// ============================================================================
// COMBAT PHASE
// ============================================================================

/**
 * Resolves combat for all districts, awarding victory points to winners.
 */
export const resolveCombat = (G: GameState, phase = 'combatPhase'): void => {
    G.districts.forEach(district => {
        district.combatWinnerId = calculateCombatWinner(district);
        if (district.combatWinnerId) {
            G.players[district.combatWinnerId].victoryPoints += 1;
            appendLog(G, {
                playerID: district.combatWinnerId,
                phase,
                type: 'combat',
                message: `wins ${district.name} (+1 VP)`,
            });
        } else {
            appendLog(G, {
                playerID: '',
                phase,
                type: 'combat',
                message: `${district.name}: draw`,
            });
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
export const calculateRanking = (G: GameState, phase = 'endGamePhase'): void => {
    G.ranking = getPlayersList(G).sort((a, b) => {
        if (b.victoryPoints !== a.victoryPoints) return b.victoryPoints - a.victoryPoints;
        if (b.candy !== a.candy) return b.candy - a.candy;
        return b.loot - a.loot;
    });

    const winner = G.ranking[0];
    if (winner) {
        appendLog(G, {
            playerID: winner.id,
            phase,
            type: 'phase',
            message: `wins the game with ${winner.victoryPoints} VP!`,
        });
    }
};
