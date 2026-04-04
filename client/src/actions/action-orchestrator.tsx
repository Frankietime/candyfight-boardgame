/**
 * Action Orchestrator
 *
 * Coordinates the collection of user input for actions.
 * Looks up the input specification from the action registry,
 * renders the appropriate input handler, and collects results.
 */

import { useState } from "react";
import { actionRegistry, ActionInputSpec, ActionParams } from "@candyfight/shared/actions";
import { Card, PlayerGameState, Location, CostAction } from "@candyfight/shared/types";
import { LocationActionsEnum } from "@candyfight/shared/enums";
import { inputHandlerRegistry, InputHandlerProps, CardSelectionResult } from "./input-handlers";

/**
 * Pending action request - what we're collecting input for
 */
export interface PendingActionRequest {
  /** The action ID being requested */
  actionId: LocationActionsEnum;

  /** Display name for the action */
  displayName: string;

  /** The input specification */
  inputSpec: ActionInputSpec;

  /** Location context (for presence tokens, etc.) */
  location?: Location;

  /** Cost action details (has params like selectionNumber) */
  costAction?: CostAction;

  /** Market cards available for purchase (passed through to CardSelectionHandler) */
  marketCards?: Card[];

  /** Callback when input is collected */
  onComplete: (params: ActionParams) => void;

  /** Callback when user cancels */
  onCancel: () => void;
}

/**
 * Hook return type
 */
export interface ActionOrchestratorState {
  /** Currently pending action request (null if none) */
  pendingRequest: PendingActionRequest | null;

  /** Request input for an action */
  requestActionInput: (
    actionId: LocationActionsEnum,
    options: {
      location?: Location;
      costAction?: CostAction;
      marketCards?: Card[];
      onComplete: (params: ActionParams) => void;
      onCancel?: () => void;
    }
  ) => void;

  /** Cancel the current request */
  cancelRequest: () => void;

  /** Check if an action requires user input */
  actionRequiresInput: (actionId: LocationActionsEnum) => boolean;
}

/**
 * Hook to manage action input collection
 */
export function useActionOrchestrator(): ActionOrchestratorState {
  const [pendingRequest, setPendingRequest] = useState<PendingActionRequest | null>(null);

  const requestActionInput = (
    actionId: LocationActionsEnum,
    options: {
      location?: Location;
      costAction?: CostAction;
      marketCards?: Card[];
      onComplete: (params: ActionParams) => void;
      onCancel?: () => void;
    }
  ) => {
    const definition = actionRegistry.getDefinition(actionId);

    if (!definition) {
      console.error(`[ActionOrchestrator] Unknown action: ${actionId}`);
      return;
    }

    const inputSpec = definition.inputSpec;

    // If no input needed, complete immediately with minimal params
    if (inputSpec.inputType === 'none') {
      // Build params based on action type
      const params = buildNoInputParams(actionId, options.costAction);
      options.onComplete(params);
      return;
    }

    // Check if we have a handler for this input type
    if (!inputHandlerRegistry.hasHandler(inputSpec.inputType)) {
      console.error(`[ActionOrchestrator] No handler for input type: ${inputSpec.inputType}`);
      return;
    }

    // Set up the pending request
    setPendingRequest({
      actionId,
      displayName: definition.displayName,
      inputSpec,
      location: options.location,
      costAction: options.costAction,
      marketCards: options.marketCards,
      onComplete: (params) => {
        setPendingRequest(null);
        options.onComplete(params);
      },
      onCancel: () => {
        setPendingRequest(null);
        options.onCancel?.();
      },
    });
  };

  const cancelRequest = () => {
    if (pendingRequest) {
      pendingRequest.onCancel();
    }
  };

  const actionRequiresInput = (actionId: LocationActionsEnum): boolean => {
    return actionRegistry.requiresInput(actionId);
  };

  return {
    pendingRequest,
    requestActionInput,
    cancelRequest,
    actionRequiresInput,
  };
}

/**
 * Build params for actions that don't require user input.
 * Uses LocationActionsEnum for type-safe action ID matching.
 */
function buildNoInputParams(actionId: LocationActionsEnum, costAction?: CostAction): ActionParams {
  // Extract numeric params from costAction if present
  const selectionNumber = costAction?.params?.selectionNumber ?? 1;

  switch (actionId) {
    case LocationActionsEnum.DRAW:
      return { actionType: LocationActionsEnum.DRAW, count: selectionNumber };
    case LocationActionsEnum.ADD_PRESENCE_TOKEN:
      return { actionType: LocationActionsEnum.ADD_PRESENCE_TOKEN };
    case LocationActionsEnum.GET_SWORD_MASTER:
      return { actionType: LocationActionsEnum.GET_SWORD_MASTER };
    case LocationActionsEnum.ADVANCE_TRACKER:
      return { actionType: LocationActionsEnum.ADVANCE_TRACKER };
    case LocationActionsEnum.DEAL:
      return { actionType: LocationActionsEnum.DEAL };
    case LocationActionsEnum.SIGNET_TRIGGER:
      return { actionType: LocationActionsEnum.SIGNET_TRIGGER };
    case LocationActionsEnum.STRANGE_CANDY_PUZZLE:
      return { actionType: LocationActionsEnum.STRANGE_CANDY_PUZZLE };
    case LocationActionsEnum.COOLDOWN:
      return { actionType: LocationActionsEnum.COOLDOWN };
    // ADD_REPAIR_TOKEN not in ActionParams union - falls through to default
    default:
      // Generic fallback - this shouldn't happen for well-defined actions
      console.warn(`[ActionOrchestrator] Unknown no-input action: ${actionId}`);
      return { actionType: actionId } as ActionParams;
  }
}

/**
 * Props for the ActionOrchestratorRenderer component
 */
export interface ActionOrchestratorRendererProps {
  /** The pending request to render input handler for */
  pendingRequest: PendingActionRequest | null;

  /** Current player state */
  player: PlayerGameState;

  /** Card to exclude from selection (the played card) */
  excludeCardId?: string;
}

/**
 * Component that renders the appropriate input handler for a pending request
 */
export function ActionOrchestratorRenderer({
  pendingRequest,
  player,
  excludeCardId,
}: ActionOrchestratorRendererProps) {
  if (!pendingRequest) {
    return null;
  }

  const { inputSpec, costAction, marketCards, onComplete, onCancel, displayName } = pendingRequest;

  // Get the handler component for this input type
  const HandlerComponent = inputHandlerRegistry.getHandler(inputSpec.inputType);

  if (!HandlerComponent) {
    console.error(`[ActionOrchestratorRenderer] No handler for: ${inputSpec.inputType}`);
    return null;
  }

  // Calculate min/max from costAction params if present
  const selectionNumber = costAction?.params?.selectionNumber;
  const minCount = selectionNumber ?? (inputSpec as any).minCount;
  const maxCount = selectionNumber ?? (inputSpec as any).maxCount;

  // Wrap onComplete to convert handler result to ActionParams
  const handleComplete = (result: unknown) => {
    const params = convertResultToParams(pendingRequest.actionId, result);
    onComplete(params);
  };

  return (
    <HandlerComponent
      key={pendingRequest.actionId}
      inputSpec={inputSpec}
      player={player}
      onComplete={handleComplete}
      onCancel={onCancel}
      minCount={minCount}
      maxCount={maxCount}
      excludeCardId={excludeCardId}
      marketCards={marketCards}
    />
  );
}

/**
 * Convert input handler result to ActionParams.
 * Uses LocationActionsEnum for type-safe action ID matching.
 */
function convertResultToParams(actionId: LocationActionsEnum, result: unknown): ActionParams {
  switch (actionId) {
    case LocationActionsEnum.DISCARD: {
      const cardResult = result as CardSelectionResult;
      return { actionType: LocationActionsEnum.DISCARD, cardIds: cardResult.cardIds };
    }
    case LocationActionsEnum.TRASH: {
      const cardResult = result as CardSelectionResult;
      return { actionType: LocationActionsEnum.TRASH, cardIds: cardResult.cardIds };
    }
    case LocationActionsEnum.BUY_CARD: {
      const cardResult = result as CardSelectionResult;
      return { actionType: LocationActionsEnum.BUY_CARD, targetCardId: cardResult.cardIds[0] };
    }
    // SELECT_AND_DISCARD not in ActionParams union - falls through to default
    default:
      console.warn(`[convertResultToParams] Unknown action: ${actionId}`);
      return { actionType: actionId } as ActionParams;
  }
}
