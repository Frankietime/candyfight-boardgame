import { ResourceEnum } from "../enums";

/**
 * Action Parameters
 *
 * Discriminated union of all possible action parameter types.
 * Each action type has its own strictly typed params.
 * All types must be JSON-serializable.
 */

// Base for all params - discriminated by actionType
export interface BaseActionParams {
  readonly actionType: string;
}

// Draw cards from deck
export interface DrawActionParams extends BaseActionParams {
  readonly actionType: 'draw';
  readonly count: number;
}

// Discard cards from hand
export interface DiscardActionParams extends BaseActionParams {
  readonly actionType: 'discard';
  readonly cardIds: string[];
}

// Trash cards (permanent removal)
export interface TrashActionParams extends BaseActionParams {
  readonly actionType: 'trash';
  readonly cardIds: string[];
}

// Buy a card from market
export interface BuyCardActionParams extends BaseActionParams {
  readonly actionType: 'buyCard';
  readonly targetCardId: string;
}

// Add presence token to district
export interface AddPresenceTokenParams extends BaseActionParams {
  readonly actionType: 'addPresenceToken';
  readonly districtId?: string; // Optional - uses context location if not specified
}

// NOTE: GetLootParams and GetCandyParams removed
// Use resources[] array instead - it's the correct pattern for simple +/- operations

// Get sword master (extra worker)
export interface GetSwordMasterParams extends BaseActionParams {
  readonly actionType: 'getSwordMaster';
}

// Advance tracker
export interface AdvanceTrackerParams extends BaseActionParams {
  readonly actionType: 'advanceTracker';
}

// Deal cards
export interface DealParams extends BaseActionParams {
  readonly actionType: 'deal';
}

// Signet trigger
export interface SignetTriggerParams extends BaseActionParams {
  readonly actionType: 'signetTrigger';
}

// Strange candy puzzle
export interface StrangeCandyPuzzleParams extends BaseActionParams {
  readonly actionType: 'strangeCandyPuzzle';
}

// Cooldown
export interface CooldownParams extends BaseActionParams {
  readonly actionType: 'cooldown';
}

// Union of all typed params
export type ActionParams =
  | DrawActionParams
  | DiscardActionParams
  | TrashActionParams
  | BuyCardActionParams
  | AddPresenceTokenParams
  | GetSwordMasterParams
  | AdvanceTrackerParams
  | DealParams
  | SignetTriggerParams
  | StrangeCandyPuzzleParams
  | CooldownParams;

// Type guards
export function isDiscardParams(params: ActionParams): params is DiscardActionParams {
  return params.actionType === 'discard';
}

export function isTrashParams(params: ActionParams): params is TrashActionParams {
  return params.actionType === 'trash';
}

export function isDrawParams(params: ActionParams): params is DrawActionParams {
  return params.actionType === 'draw';
}

export function isBuyCardParams(params: ActionParams): params is BuyCardActionParams {
  return params.actionType === 'buyCard';
}

// Helper to create params with type inference
export const createParams = {
  draw: (count: number): DrawActionParams => ({ actionType: 'draw', count }),
  discard: (cardIds: string[]): DiscardActionParams => ({ actionType: 'discard', cardIds }),
  trash: (cardIds: string[]): TrashActionParams => ({ actionType: 'trash', cardIds }),
  buyCard: (targetCardId: string): BuyCardActionParams => ({ actionType: 'buyCard', targetCardId }),
  addPresenceToken: (districtId?: string): AddPresenceTokenParams => ({ actionType: 'addPresenceToken', districtId }),
  getSwordMaster: (): GetSwordMasterParams => ({ actionType: 'getSwordMaster' }),
  advanceTracker: (): AdvanceTrackerParams => ({ actionType: 'advanceTracker' }),
  deal: (): DealParams => ({ actionType: 'deal' }),
};
