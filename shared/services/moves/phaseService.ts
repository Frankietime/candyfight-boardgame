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

/** Player choices collected in the reveal-resolution modal. */
export type RevealMoveParams = {
    /** card instance id → district id where its "+1 Fight" presence goes */
    fightDistricts?: Record<string, string>;
    /** puzzle card id → hand card ids the player selected to solve it */
    puzzleSelections?: Record<string, string[]>;
};

/**
 * Districts eligible for a "+1 Fight" reveal: only where the player has an
 * agent placed this round (a location they claimed).
 */
export const eligibleFightDistricts = (G: GameState, player: PlayerGameState): string[] =>
    G.districts
        .filter(d => d.locations.some(l => l.takenByPlayerID === player.id))
        .map(d => d.id as string);

/**
 * Fires the reveal (secondary) effects of the player's REVEALED HAND — the
 * cards they kept and show when revealing. secondaryResources are added
 * directly; each secondaryEffect runs through the action registry.
 * "+1 Fight" goes to the district the player chose (revealParams), falling
 * back to the card's first symbol. The Puzzle card enables its challenge but
 * never counts toward it (excludeCardId).
 */
export const executeRevealEffects = (
    mgState: MetaGameState,
    player: PlayerGameState,
    revealParams?: RevealMoveParams
): void => {
    [...player.hand].forEach(card => {
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
            let params = effect.params ?? {};
            if (effect.actionId === LocationActionsEnum.ADD_PRESENCE_TOKEN) {
                // Presence may only go where the player has an agent; an
                // invalid/missing pick falls back to the first eligible
                // district. No agents anywhere → the effect fizzles.
                const eligible = eligibleFightDistricts(mgState.G, player);
                const picked = revealParams?.fightDistricts?.[card.id];
                const districtId = picked && eligible.includes(picked) ? picked : eligible[0];
                if (!districtId) {
                    appendLog(mgState.G, {
                        playerID: player.id,
                        phase: mgState.ctx.phase ?? '',
                        type: 'effect',
                        message: `${card.name}: Fight! fizzles — no agents on the board`,
                        card,
                    });
                    return;
                }
                params = { ...params, districtId };
            }
            if (effect.actionId === LocationActionsEnum.STRANGE_CANDY_PUZZLE) {
                params = {
                    ...params,
                    excludeCardId: card.id,
                    selectedCardIds: revealParams?.puzzleSelections?.[card.id],
                };
            }
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
