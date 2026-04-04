/**
 * Core Actions Registration
 *
 * Registers all built-in game actions with the ActionRegistry.
 * This file should be imported at game initialization to ensure
 * all core actions are available.
 */

import { LocationActionsEnum } from "../enums";
import { isNullOrEmpty } from "../common-methods";
import { actionRegistry, ActionDefinition, ActionHandler, ActionContext } from "./action-registry";
import {
  DrawActionParams,
  DiscardActionParams,
  TrashActionParams,
  AddPresenceTokenParams,
  GetSwordMasterParams,
  BuyCardActionParams,
} from "./action-params";
import { MARKET_ROW_SIZE } from "../constants";
import { Card, MetaGameState, PlayerGameState } from "../types";
import { characterDefinitions } from "../characters/character-definitions";
import { appendLog } from "../services/logService";

// ============================================================================
// Helper functions (adapted from existing moves.ts)
// ============================================================================

const takeFromHand = (player: PlayerGameState, cardIds: string[]): Card[] | null => {
  const cards: Card[] = [];
  for (const cardId of cardIds) {
    const index = player.hand.findIndex(c => c.id === cardId);
    if (index === -1) return null;
    cards.push(...player.hand.splice(index, 1));
  }
  return cards;
};

const doDraw = (player: PlayerGameState) => {
  if (player.deck.length > 0) {
    player.hand.push(player.deck.pop()!);
  }
};

const rebuildDeck = (player: PlayerGameState, random: any): Card[] => {
  return player.deck = random.Shuffle(player.discardPile).map(() => player.discardPile.pop());
};

// ============================================================================
// DRAW Action
// ============================================================================

const drawDefinition: ActionDefinition<DrawActionParams> = {
  id: LocationActionsEnum.DRAW,
  displayName: "Draw Cards",
  inputSpec: { inputType: 'none' }, // Count comes from action params, not user input
  tags: ['core', 'cards'],
};

const drawHandler: ActionHandler<DrawActionParams> = {
  execute: (params, state, player) => {
    // Accept both typed params.count and legacy params.selectionNumber
    const count = params.count ?? (params as any).selectionNumber ?? 1;

    if (player.deck.length === 0) {
      rebuildDeck(player, state.random);
    }

    for (let i = 0; i < count; i++) {
      if (player.deck.length > 0) {
        doDraw(player);
      } else {
        rebuildDeck(player, state.random);
        doDraw(player);
      }
    }

    appendLog(state.G, {
      playerID: state.ctx.currentPlayer,
      phase: state.ctx.phase ?? '',
      type: 'effect',
      message: `drew ${count} card${count !== 1 ? 's' : ''}`,
    });
  },
};

// ============================================================================
// DISCARD Action
// ============================================================================

const discardDefinition: ActionDefinition<DiscardActionParams> = {
  id: LocationActionsEnum.DISCARD,
  displayName: "Discard Cards",
  inputSpec: {
    inputType: 'cardSelection',
    source: 'hand',
    minCount: 1,
    maxCount: 10, // Will be constrained by action params
    filter: { excludePlayedCard: true },
  },
  tags: ['core', 'cards', 'cost'],
};

const discardHandler: ActionHandler<DiscardActionParams> = {
  validate: (params, state, player) => {
    if (!params.cardIds || params.cardIds.length === 0) {
      return "Must select at least one card to discard";
    }

    // Verify all cards exist in hand
    for (const cardId of params.cardIds) {
      const inHand = player.hand.some(c => c.id === cardId);
      if (!inHand) {
        return `Card ${cardId} is not in hand`;
      }
    }

    return null;
  },

  execute: (params, state, player) => {
    const cards = takeFromHand(player, params.cardIds);
    if (cards) {
      player.discardPile = [...player.discardPile, ...cards];
      appendLog(state.G, {
        playerID: state.ctx.currentPlayer,
        phase: state.ctx.phase ?? '',
        type: 'effect',
        message: `discarded ${cards.length} card${cards.length !== 1 ? 's' : ''}`,
      });
    }
  },
};

// ============================================================================
// TRASH Action
// ============================================================================

const trashDefinition: ActionDefinition<TrashActionParams> = {
  id: LocationActionsEnum.TRASH,
  displayName: "Trash Cards",
  inputSpec: {
    inputType: 'cardSelection',
    source: 'hand',
    minCount: 1,
    maxCount: 10,
    filter: { excludePlayedCard: true },
  },
  tags: ['core', 'cards', 'cost'],
};

const trashHandler: ActionHandler<TrashActionParams> = {
  validate: (params, state, player) => {
    if (!params.cardIds || params.cardIds.length === 0) {
      return "Must select at least one card to trash";
    }

    // Check minimum deck size (can't trash if would go below 5 total cards)
    const totalCards = player.deck.length + player.discardPile.length + player.hand.length;
    if (totalCards <= 5) {
      return "Cannot trash: would reduce deck below minimum size";
    }

    // Verify all cards exist in hand
    for (const cardId of params.cardIds) {
      const inHand = player.hand.some(c => c.id === cardId);
      if (!inHand) {
        return `Card ${cardId} is not in hand`;
      }
    }

    return null;
  },

  execute: (params, state, player) => {
    const cards = takeFromHand(player, params.cardIds);
    if (cards) {
      player.trashPile = [...player.trashPile, ...cards];
      appendLog(state.G, {
        playerID: state.ctx.currentPlayer,
        phase: state.ctx.phase ?? '',
        type: 'effect',
        message: `trashed ${cards.length} card${cards.length !== 1 ? 's' : ''}`,
      });
    }
  },
};

// ============================================================================
// ADD_PRESENCE_TOKEN Action
// ============================================================================

const addPresenceTokenDefinition: ActionDefinition<AddPresenceTokenParams> = {
  id: LocationActionsEnum.ADD_PRESENCE_TOKEN,
  displayName: "Add Presence Token",
  inputSpec: { inputType: 'none' }, // Uses context location
  tags: ['core', 'presence'],
};

const addPresenceTokenHandler: ActionHandler<AddPresenceTokenParams> = {
  execute: (params, state, player, context) => {
    const districtId = params.districtId ?? context?.location?.districtId;
    if (!districtId) return;

    const district = state.G.districts.find(d => d.id === districtId);
    if (!district) return;

    if (!isNullOrEmpty(district.presence) && district.presence[player.id]) {
      district.presence[player.id].amount += 1;
    } else {
      district.presence = {
        ...district.presence,
        [player.id]: { playerID: player.id, amount: 1 }
      };
    }
  },
};

// ============================================================================
// GET_LOOT / GET_CANDY - NOT NEEDED
// ============================================================================
// These are simple +/- operations on player resources.
// Per our design principle, use resources[] array instead:
//   reward: { resources: [{ resourceId: ResourceEnum.Loot, amount: 1 }] }
//
// Cards should use primaryResources, locations use reward.resources.
// No action registry needed for simple numeric resource changes.

// ============================================================================
// GET_SWORD_MASTER Action
// ============================================================================

const getSwordMasterDefinition: ActionDefinition<GetSwordMasterParams> = {
  id: LocationActionsEnum.GET_SWORD_MASTER,
  displayName: "Get Sword Master",
  inputSpec: { inputType: 'none' },
  tags: ['core', 'workers'],
};

const getSwordMasterHandler: ActionHandler<GetSwordMasterParams> = {
  execute: (params, state, player) => {
    player.currentNumberOfWorkers += 1;
    player.maxNumberOfWorkers += 1;
  },
};

// ============================================================================
// BUY_CARD Action
// ============================================================================

const buyCardDefinition: ActionDefinition<BuyCardActionParams> = {
  id: LocationActionsEnum.BUY_CARD,
  displayName: "Buy Card",
  inputSpec: {
    inputType: 'cardSelection',
    source: 'market',
    minCount: 1,
    maxCount: 1,
  },
  tags: ['core', 'cards', 'market'],
};

const buyCardHandler: ActionHandler<BuyCardActionParams> = {
  validate: (params, state) => {
    const visibleCards = state.G.cardMarket.slice(0, MARKET_ROW_SIZE);
    if (visibleCards.length === 0) return "The market is empty";
    const isAvailable = visibleCards.some(c => c.id === params.targetCardId);
    if (!isAvailable) return `Card ${params.targetCardId} is not available in the market`;
    return null;
  },
  execute: (params, state, player) => {
    const index = state.G.cardMarket.findIndex(c => c.id === params.targetCardId);
    if (index !== -1) {
      const [card] = state.G.cardMarket.splice(index, 1);
      player.discardPile = [...player.discardPile, card];
      appendLog(state.G, {
        playerID: state.ctx.currentPlayer,
        phase: state.ctx.phase ?? '',
        type: 'effect',
        message: `bought ${card.name} → discard pile`,
        card,
      });
    }
  },
};

// ============================================================================
// Stub Actions (not yet implemented)
// ============================================================================

const stubDefinition = (id: string, displayName: string): ActionDefinition => ({
  id,
  displayName,
  inputSpec: { inputType: 'none' },
  tags: ['stub'],
});

const stubHandler: ActionHandler = {
  execute: () => {
    // Not implemented yet
  },
};

// ============================================================================
// Registration
// ============================================================================

export function registerCoreActions(): void {
  // Fully implemented actions
  actionRegistry.register(drawDefinition, drawHandler);
  actionRegistry.register(discardDefinition, discardHandler);
  actionRegistry.register(trashDefinition, trashHandler);
  actionRegistry.register(addPresenceTokenDefinition, addPresenceTokenHandler);
  actionRegistry.register(getSwordMasterDefinition, getSwordMasterHandler);

  // NOTE: GET_LOOT and GET_CANDY are NOT registered here.
  // Use resources[] array instead - it's the correct pattern for simple +/- operations.

  actionRegistry.register(buyCardDefinition, buyCardHandler);

  // Stub actions (placeholders for future implementation)
  actionRegistry.register(
    stubDefinition(LocationActionsEnum.ADVANCE_TRACKER, "Advance Tracker"),
    stubHandler
  );
  actionRegistry.register(
    stubDefinition(LocationActionsEnum.COOLDOWN, "Cooldown"),
    stubHandler
  );
  actionRegistry.register(
    stubDefinition(LocationActionsEnum.DEAL, "Deal"),
    stubHandler
  );
  actionRegistry.register(
    {
      id: LocationActionsEnum.SIGNET_TRIGGER,
      displayName: "Signet Trigger",
      inputSpec: { inputType: 'none' },
      tags: ['core', 'character'],
    },
    {
      execute: (params, state, player, context) => {
        if (!player.characterId) return;
        const character = characterDefinitions[player.characterId];
        character?.executeSignetAbility(state, player, context);
      }
    }
  );
  actionRegistry.register(
    stubDefinition(LocationActionsEnum.STRANGE_CANDY_PUZZLE, "Strange Candy Puzzle"),
    stubHandler
  );
  actionRegistry.register(
    stubDefinition(LocationActionsEnum.ADD_REPAIR_TOKEN, "Add Repair Token"),
    stubHandler
  );
}

// Auto-register on import (alternatively, call registerCoreActions() explicitly)
registerCoreActions();
