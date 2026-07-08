/**
 * Input Handler Registry
 *
 * Registry for UI components that handle action input collection.
 * Each input type (cardSelection, resourceSelection, etc.) has
 * a corresponding handler component registered here.
 */

import { ComponentType } from "react";
import { ActionInputSpec } from "@candyfight/shared/actions";
import { Card, PlayerGameState } from "@candyfight/shared/types";

/**
 * Common props passed to all input handler components
 */
export interface InputHandlerProps<TResult = unknown> {
  /** The input specification from the action definition */
  inputSpec: ActionInputSpec;

  /** Current player state for validation/filtering */
  player: PlayerGameState;

  /** Called when user completes input selection */
  onComplete: (result: TResult) => void;

  /** Called when user cancels the input */
  onCancel: () => void;

  /** Optional: Minimum required selections (can override inputSpec) */
  minCount?: number;

  /** Optional: Maximum allowed selections (can override inputSpec) */
  maxCount?: number;

  /** Optional: Card to exclude from selection (the played card) */
  excludeCardId?: string;

  /** Market cards available for purchase (used when source === 'market') */
  marketCards?: Card[];

  /** Tutorial-only: card id to visually highlight in the selection grid. */
  highlightCardId?: string;

  /**
   * Tutorial-only: when set, ONLY these card ids are selectable; every other card in
   * the grid is disabled. Used to force the player to pick exactly the cards the
   * lesson calls for (market card, specific trash fodder, …).
   */
  lockToCardIds?: string[];
}

/**
 * Result types for each input handler
 */
export interface CardSelectionResult {
  cardIds: string[];
  cards: Card[];
}

export interface ResourceSelectionResult {
  resources: { resourceId: string; amount: number }[];
}

export interface ConfirmationResult {
  confirmed: boolean;
}

export interface ChoiceResult {
  choiceId: string;
}

/**
 * Input handler component type
 */
export type InputHandlerComponent<TResult = unknown> = ComponentType<InputHandlerProps<TResult>>;

/**
 * Input Handler Registry Implementation
 */
class InputHandlerRegistryImpl {
  private handlers = new Map<string, InputHandlerComponent<any>>();

  /**
   * Register a handler component for an input type
   */
  register<TResult>(
    inputType: string,
    component: InputHandlerComponent<TResult>
  ): void {
    if (this.handlers.has(inputType)) {
      console.warn(`[InputHandlerRegistry] Handler for "${inputType}" already registered, overwriting`);
    }
    this.handlers.set(inputType, component);
  }

  /**
   * Get handler component for an input type
   */
  getHandler<TResult = unknown>(inputType: string): InputHandlerComponent<TResult> | undefined {
    return this.handlers.get(inputType);
  }

  /**
   * Check if a handler is registered for an input type
   */
  hasHandler(inputType: string): boolean {
    return this.handlers.has(inputType);
  }

  /**
   * Get all registered input types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// Singleton instance
export const inputHandlerRegistry = new InputHandlerRegistryImpl();
