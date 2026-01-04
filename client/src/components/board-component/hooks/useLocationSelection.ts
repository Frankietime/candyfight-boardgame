import { GameState, PlayerGameState, Location, Card } from "@candyfight/shared/types";
import { LocationActionsEnum } from "@candyfight/shared/enums";
import { Ctx } from "boardgame.io";
import { ActionParams } from "@candyfight/shared/actions";

export interface UseLocationSelectionOptions {
  /** Current game state */
  G: GameState;
  /** Boardgame.io context */
  ctx: Ctx;
  /** Current player's game state */
  player: PlayerGameState;
  /** Moves object from boardgame.io */
  moves: {
    placeWorker: (G: GameState, districtIndex: number, locationIndex: number, selectedCard?: Card, actionParams?: ActionParams) => void;
    [key: string]: any;
  };
  /** Action orchestrator for handling complex actions */
  actionOrchestrator: {
    requestActionInput: (
      actionId: LocationActionsEnum,
      context: {
        location: Location;
        costAction: { actionId: LocationActionsEnum; [key: string]: any };
        onComplete: (params: ActionParams) => void;
        onCancel: () => void;
      }
    ) => void;
    pendingRequest: any;
  };
}

export interface UseLocationSelectionResult {
  /**
   * Handler for when a location is selected.
   * Handles action orchestration for DISCARD/TRASH actions.
   */
  onLocationSelect: (districtIndex: number, locationIndex: number) => void;

  /**
   * Check if a location should be disabled for selection.
   */
  isLocationDisabled: (location: Location) => boolean;

  /**
   * Get the currently selected card for the current player.
   */
  getSelectedCard: () => Card | undefined;

  /**
   * Whether the current player has already played a card this turn.
   */
  hasPlayedCard: boolean;
}

/**
 * Custom hook for managing location selection logic.
 *
 * Extracts the location selection logic from BoardComponent for better
 * separation of concerns and reusability.
 */
export function useLocationSelection({
  G,
  ctx,
  player,
  moves,
  actionOrchestrator,
}: UseLocationSelectionOptions): UseLocationSelectionResult {
  // Get the currently selected card for the current player
  const getSelectedCard = (): Card | undefined => {
    return G.players[ctx.currentPlayer]?.selectedCard;
  };

  // Check if a location should be disabled for selection
  const isLocationDisabled = (location: Location): boolean => {
    const currentPlayerState = G.players[ctx.currentPlayer];

    const isSwordMasterAtMax =
      location.name.includes("Sword Master") && player.maxNumberOfWorkers >= 3;

    const noCardSelected = !currentPlayerState?.selectedCard;
    const noWorkersAvailable = player.currentNumberOfWorkers === 0;

    return (
      isSwordMasterAtMax ||
      location.isDisabled === true ||
      noCardSelected ||
      noWorkersAvailable
    );
  };

  // Handler for when a location is selected
  const onLocationSelect = (districtIndex: number, locationIndex: number) => {
    if (player.hasPlayedCard) {
      return;
    }

    const selectedCard = getSelectedCard();
    const selectedLocation = G.districts[districtIndex].locations[locationIndex];

    const cardSelectionAction = selectedLocation.cost.actions?.find(
      a => a.actionId === LocationActionsEnum.DISCARD || a.actionId === LocationActionsEnum.TRASH
    );

    if (player.hand.length >= 2 && cardSelectionAction) {
      actionOrchestrator.requestActionInput(cardSelectionAction.actionId, {
        location: selectedLocation,
        costAction: cardSelectionAction,
        onComplete: (params: ActionParams) => {
          moves.placeWorker(G, districtIndex, locationIndex, selectedCard, params);
        },
        onCancel: () => {},
      });
    } else {
      if (!player.hasPlayedCard && selectedLocation.takenByPlayerID === undefined) {
        moves.placeWorker(G, districtIndex, locationIndex, selectedCard);
      }
    }
  };

  return {
    onLocationSelect,
    isLocationDisabled,
    getSelectedCard,
    hasPlayedCard: player.hasPlayedCard,
  };
}
