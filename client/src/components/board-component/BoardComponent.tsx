import mapBg from "../../assets/board/board-background.png";
import { BoardProps } from "boardgame.io/react";
import { GameState, PlayerGameState, Location, Card, isFullPlayerState } from "@candyfight/shared/types";
import { GameInfoComponent } from "../game-info-component/GameInfoComponent";
import { isNullOrEmpty } from "@candyfight/shared/common-methods";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { LocationActionsEnum } from "@candyfight/shared/enums";
import { useAppStore } from "../../store";
import { PlayerAreaComponent } from "../player-area-component/PlayerAreaComponent";
import { useLobbyServices } from "../../services/lobbyServices";
import { useActionOrchestrator, ActionOrchestratorRenderer } from "../../actions/action-orchestrator";
import { ActionParams } from "@candyfight/shared/actions";
import { WorkerMoveParams } from "@candyfight/shared/services/moves/workerPlacementService";
import { MARKET_ROW_SIZE } from "@candyfight/shared/constants";
import { useMatchQuery } from "../../hooks/useMatchQuery";
import { isBotMatch } from "../../botMatch";
import { QueryErrorFallback, DistrictLoader } from "../ui";
// Extracted hooks and components
import { useBoardScale, getScaleStyle, getBoardContainerStyle } from "./hooks/useBoardScale";
import { BoardDistrictsLayer } from "./BoardDistrictsLayer";
import { EndGameDialog, CombatPhaseDialog } from "./dialogs";
// Import to trigger handler registration
import "../input-handlers/CardSelectionHandler";
import { CharacterSelectionScreen } from "../character-selection/CharacterSelectionScreen";

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
      (location.reward.actions?.some(a => a.actionId === LocationActionsEnum.GET_SWORD_MASTER) && player.maxNumberOfWorkers >= 3) ||
      location.isDisabled ||
      location.takenByPlayerID !== undefined ||
      !selectedCard ||
      player.currentNumberOfWorkers === 0
    );
  }, [player, selectedCard]);

  // Handle location selection - memoized with proper dependencies
  const onLocationSelect = useCallback((districtIndex: number, locationIndex: number) => {
    if (!player || player.hasPlayedCard) return;

    const selectedLocation = G.districts[districtIndex].locations[locationIndex];

    // A taken location can't be entered again — bail before any input dialog
    // (trash/buy) is opened, not just in the final plain-placement branch.
    if (selectedLocation.takenByPlayerID !== undefined) return;

    const trashCostAction = selectedLocation.cost.actions?.find(
      a => a.actionId === LocationActionsEnum.DISCARD || a.actionId === LocationActionsEnum.TRASH
    );
    const buyCardRewardAction = selectedLocation.reward.actions?.find(
      a => a.actionId === LocationActionsEnum.BUY_CARD
    );

    const marketRow = G.cardMarket.slice(0, MARKET_ROW_SIZE);

    const doPlaceWorker = (costParams?: ActionParams, rewardParams?: ActionParams) => {
      const moveParams: WorkerMoveParams | undefined =
        (costParams || rewardParams) ? { costParams, rewardParams } : undefined;
      moves.placeWorker(districtIndex, locationIndex, selectedCard, moveParams);
    };

    const needsTrashInput = !!(trashCostAction && player.hand.length >= 2);
    const needsBuyInput = !!buyCardRewardAction;

    if (needsTrashInput && needsBuyInput) {
      // Step 1: collect trash cost, then step 2: collect market card
      actionOrchestrator.requestActionInput(trashCostAction!.actionId, {
        location: selectedLocation,
        costAction: trashCostAction,
        onComplete: (trashParams) => {
          actionOrchestrator.requestActionInput(LocationActionsEnum.BUY_CARD, {
            marketCards: marketRow,
            onComplete: (buyParams) => doPlaceWorker(trashParams, buyParams),
            onCancel: () => {},
          });
        },
        onCancel: () => {},
      });
    } else if (needsTrashInput) {
      actionOrchestrator.requestActionInput(trashCostAction!.actionId, {
        location: selectedLocation,
        costAction: trashCostAction,
        onComplete: (costParams) => doPlaceWorker(costParams),
        onCancel: () => {},
      });
    } else if (needsBuyInput) {
      actionOrchestrator.requestActionInput(LocationActionsEnum.BUY_CARD, {
        marketCards: marketRow,
        onComplete: (buyParams) => doPlaceWorker(undefined, buyParams),
        onCancel: () => {},
      });
    } else {
      // takenByPlayerID already guarded by the early return above.
      doPlaceWorker();
    }
  }, [player, G.districts, G.cardMarket, selectedCard, actionOrchestrator, moves]);

  // Clicking empty board space (not the hand, a location, a dialog or an
  // action button) deselects the card — back to the "all possible plays" view.
  const onBoardClick = useCallback((e: MouseEvent) => {
    if (!selectedCard) return;
    const target = e.target as HTMLElement;
    if (target.closest(
      ".hand-container, .location-tile, .pile-modal, .pass-btn, .reveal-btn, .card-selection-dialog-content, [role='dialog']"
    )) return;
    moves.selectCard(null);
  }, [selectedCard, moves]);

  // Handle leaving match - memoized
  const onLeaveMatch = useCallback(async () => {
    const clearMatch = () => setPlayerState({
      ...playerState,
      matchID: "",
      playerCredentials: ""
    });
    // vs-Bots matches have no server match to leave.
    if (isBotMatch(playerState.matchID)) {
      clearMatch();
      return;
    }
    leaveMatch(playerState).then(clearMatch);
  }, [leaveMatch, playerState, setPlayerState]);

  // Handle ending round - memoized
  const onEndRound = useCallback(() => {
    moves.endRound();
    setRoundIsEnding(true);
  }, [moves]);

  // Visible market row and player names - memoized so child React.memo
  // components (BoardDistrictsLayer, PlayerAreaComponent) don't see a new
  // array identity every render.
  const marketCards = useMemo(() => G.cardMarket.slice(0, MARKET_ROW_SIZE), [G.cardMarket]);
  const playerNames = useMemo(
    () => matchData?.players.map((p, i) => p?.name ?? `Player ${i + 1}`) ?? [],
    [matchData?.players]
  );

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
        {!isReady && <DistrictLoader />}
        {isReady && ctx.phase === 'characterSelectionPhase' && (
          <div className="board-viewport">
            <div className="board-container relative mx-auto">
              <CharacterSelectionScreen
                playersViewModel={G.playersViewModel}
                matchData={matchData}
                playerID={playerID ?? null}
                moves={moves}
              />
            </div>
          </div>
        )}

        {isReady && ctx.phase !== 'characterSelectionPhase' && (
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
              onClick={onBoardClick}
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
                marketCards={marketCards}
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
                moves={moves}
                player={player}
                selectedCard={selectedCard}
                playerNames={playerNames}
                currentPlayerId={ctx.phase === 'combatPhase' ? 'all' : ctx.currentPlayer}
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
