/**
 * Effect Factories
 *
 * Helper functions for creating resources and actions in card/location definitions.
 * These provide a cleaner, more readable API than raw object literals.
 *
 * Design Principle:
 * - Use `resources.*` for simple numeric +/- operations (loot, candy)
 * - Use `actions.*` for complex logic requiring validation or game state changes
 */

import { LocationActionsEnum, ResourceEnum } from "../enums";
import { ResourceBag, RewardAction } from "../types";

/**
 * Resource factories - for simple numeric resource changes.
 * Use these with `primaryResources`, `secondaryResources`, or location `resources`.
 */
export const resources = {
  loot: (amount = 1): ResourceBag => ({
    resourceId: ResourceEnum.Loot,
    amount,
  }),

  candy: (amount = 1): ResourceBag => ({
    resourceId: ResourceEnum.Candy,
    amount,
  }),
};

/**
 * Action factories - for complex game logic.
 * Use these with `primaryEffects`, `secondaryEffects`, or location `actions`.
 */
export const actions = {
  draw: (count = 1): RewardAction => ({
    actionId: LocationActionsEnum.DRAW,
    name: "Draw",
    params: { count },
  }),

  addPresence: (): RewardAction => ({
    actionId: LocationActionsEnum.ADD_PRESENCE_TOKEN,
    name: "Fight!",
  }),

  getSwordMaster: (): RewardAction => ({
    actionId: LocationActionsEnum.GET_SWORD_MASTER,
    name: "Sword Master",
  }),

  advanceTracker: (): RewardAction => ({
    actionId: LocationActionsEnum.ADVANCE_TRACKER,
    name: "Advance Tracker",
  }),

  strangeCandyPuzzle: (): RewardAction => ({
    actionId: LocationActionsEnum.STRANGE_CANDY_PUZZLE,
    name: "Strange Candy Puzzle",
  }),

  cooldown: (): RewardAction => ({
    actionId: LocationActionsEnum.COOLDOWN,
    name: "Cooldown",
  }),

  signetTrigger: (): RewardAction => ({
    actionId: LocationActionsEnum.SIGNET_TRIGGER,
    name: "Signet Trigger",
  }),

  deal: (): RewardAction => ({
    actionId: LocationActionsEnum.DEAL,
    name: "Deal",
  }),

  buyCard: (targetCardId?: string): RewardAction => ({
    actionId: LocationActionsEnum.BUY_CARD,
    name: "Buy Card",
    params: targetCardId ? { targetCardId } : undefined,
  }),

  addRepairToken: (): RewardAction => ({
    actionId: LocationActionsEnum.ADD_REPAIR_TOKEN,
    name: "Repair",
  }),
};

/**
 * Combined effects helper for common patterns.
 */
export const effects = {
  resources,
  actions,
};
