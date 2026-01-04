import mapBg from "../../assets/board/prodis-tablero-estilo-y-char-v1.png";
import { BoardProps } from "boardgame.io/react";
import { GameState, PlayerGameState, Location, Card, isFullPlayerState } from "@candyfight/shared/types";
import { GameInfoComponent } from "../game-info-component/GameInfoComponent";
import { isNullOrEmpty } from "@candyfight/shared/common-methods";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LocationActionsEnum } from "@candyfight/shared/enums";
import { useAppStore } from "../../store";
import { PlayerAreaComponent } from "../player-area-component/PlayerAreaComponent";
import { useLobbyServices } from "../../services/lobbyServices";
import { useActionOrchestrator, ActionOrchestratorRenderer } from "../../actions/action-orchestrator";
import { ActionParams } from "@candyfight/shared/actions";
import { useMatchQuery } from "../../hooks/useMatchQuery";
import { QueryErrorFallback } from "../ui";
// Extracted hooks and components
import { useBoardScale, getScaleStyle, getBoardContainerStyle } from "./hooks/useBoardScale";
import { BoardDistrictsLayer } from "./BoardDistrictsLayer";
import { EndGameDialog, CombatPhaseDialog } from "./dialogs";
// Import to trigger handler registration
import "../input-handlers/CardSelectionHandler";

interface BoardGameProps extends BoardProps<GameState> {}

export const BoardComponent = ({
  ctx,
  G,
  moves,
  events,
  matchID,
  playerID,
}: BoardGameProps) => {
  // Use extracted hook for responsive scaling
  const { scale, outerRef, baseWidth, baseHeight } = useBoardScale();

  const { leaveMatch } = useLobbyServices();
  const { playerState, setPlayerState } = useAppStore();

  // Fetch match data with React Query
  const { data: matchData, error: matchError, refetch } = useMatchQuery(playerState?.matchID);

  // Action orchestrator for handling action input
  const actionOrchestrator = useActionOrchestrator();

  // Round ending state for combat phase
  const [roundIsEnding, setRoundIsEnding] = useState(false);

  // Reset UI state at the beginning of the round
  useEffect(() => {
    if (ctx.phase === "mainPhase") {
      setRoundIsEnding(false);
    }
  }, [ctx.phase]);

  // Current player state - use type guard to safely access full state
  const player = useMemo<PlayerGameState | null>(() => {
    if (playerID != null) {
      const playerState = G.players[playerID];
      if (playerState && isFullPlayerState(playerState)) {
        return playerState;
      }
    }
    return null;
  }, [G.players, playerID]);

  // Get currently selected card (not memoized - G changes every render)
  // Use type guard to safely access selectedCard (only exists on full state)
  const currentPlayerState = G.players[ctx.currentPlayer];
  const selectedCard = currentPlayerState && isFullPlayerState(currentPlayerState)
    ? currentPlayerState.selectedCard
    : undefined;

  // Check if location is disabled - memoized with proper dependencies
  const isLocationDisabled = useCallback((location: Location): boolean => {
    if (!player) return true;
    return (
      (location.name.includes("Sword Master") && player.maxNumberOfWorkers >= 3) ||
      location.isDisabled ||
      !selectedCard ||
      player.currentNumberOfWorkers === 0
    );
  }, [player, selectedCard]);

  // Handle location selection - memoized with proper dependencies
  const onLocationSelect = useCallback((districtIndex: number, locationIndex: number) => {
    if (!player || player.hasPlayedCard) return;

    const selectedLocation = G.districts[districtIndex].locations[locationIndex];

    // Find cost action that requires card selection (DISCARD or TRASH)
    const cardSelectionAction = selectedLocation.cost.actions?.find(
      a => a.actionId === LocationActionsEnum.DISCARD || a.actionId === LocationActionsEnum.TRASH
    );

    // Use the action orchestrator for DISCARD/TRASH actions
    if (player.hand.length >= 2 && cardSelectionAction) {
      actionOrchestrator.requestActionInput(cardSelectionAction.actionId, {
        location: selectedLocation,
        costAction: cardSelectionAction,
        onComplete: (params: ActionParams) => {
          moves.placeWorker(districtIndex, locationIndex, selectedCard, params);
        },
        onCancel: () => {
          // User cancelled - do nothing
        }
      });
    } else {
      // No card selection needed, place worker directly
      if (!player.hasPlayedCard && selectedLocation.takenByPlayerID === undefined) {
        moves.placeWorker(districtIndex, locationIndex, selectedCard);
      }
    }
  }, [player, G.districts, selectedCard, actionOrchestrator, moves]);

  // Handle leaving match - memoized
  const onLeaveMatch = useCallback(async () => {
    leaveMatch(playerState).then(() => {
      setPlayerState({
        ...playerState,
        matchID: "",
        playerCredentials: ""
      });
    });
  }, [leaveMatch, playerState, setPlayerState]);

  // Handle ending round - memoized
  const onEndRound = useCallback(() => {
    moves.endRound();
    setRoundIsEnding(true);
  }, [moves]);

  // Check if we're ready to render the full board
  const isReady = !isNullOrEmpty(matchID) && G.districts && G.players && player && matchData;

  // Show error state if match query failed
  if (matchError) {
    return (
      <div className="game-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <QueryErrorFallback error={matchError} onRetry={() => refetch()} />
      </div>
    );
  }

  // Always render the board-outer div so the ref is connected and scale hook works
  return (
    <div className="game-container">
      <div
        className="w-screen overflow-auto board-outer"
        ref={outerRef}
        style={getScaleStyle(scale)}
      >
        {isReady && (
          <div className="board-viewport">
            {/* Game Info Header */}
            <GameInfoComponent
              playersPublicInfo={G.playersViewModel}
              G={G}
              ctx={ctx}
              onLeaveMatch={onLeaveMatch}
            />

            {/* Board Area */}
            <div
              style={getBoardContainerStyle(mapBg)}
              className="board-container relative mx-auto"
            >
              {/* Districts Layer */}
              <BoardDistrictsLayer
                districts={G.districts}
                playersViewModel={G.playersViewModel}
                phase={ctx.phase ?? ""}
                matchData={matchData}
                player={player}
                selectedCard={selectedCard}
                onLocationSelect={onLocationSelect}
                isLocationDisabled={isLocationDisabled}
              />

              {/* Action Orchestrator Renderer */}
              <ActionOrchestratorRenderer
                pendingRequest={actionOrchestrator.pendingRequest}
                player={player}
                excludeCardId={selectedCard?.id}
              />

              {/* Player Area */}
              <PlayerAreaComponent
                G={G}
                playerView={G.playersViewModel}
                events={events}
                moves={moves}
                player={player}
                selectedCard={selectedCard}
              />

              {/* Combat Phase Dialog */}
              <CombatPhaseDialog
                open={ctx.phase === "combatPhase"}
                districts={G.districts}
                matchData={matchData}
                isRoundEnding={roundIsEnding}
                onEndRound={onEndRound}
              />

              {/* End Game Dialog */}
              <EndGameDialog
                open={ctx.phase === "endGamePhase"}
                ranking={G.ranking}
                matchData={matchData}
                onLeaveMatch={onLeaveMatch}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
