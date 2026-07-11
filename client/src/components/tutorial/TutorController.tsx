/**
 * TutorController — the step runner that ties everything together.
 *
 * It owns a {@link TutorEngine} (authentic rule execution over a scripted state),
 * walks the active chapter's steps, gates board input to the highlighted target,
 * plays scripted opponent moves, and renders the **reused** production board
 * (BoardDistrictsLayer + PlayerAreaComponent) plus the signal overlay and dialog.
 *
 * Re-render strategy: the engine mutates its GameState in place, so after every
 * change we publish a fresh `structuredClone` snapshot — new object refs let the
 * memoized board components re-render.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import mapBg from "../../assets/board/board-background.png";
import { Card, GameState, Location, PlayerGameState } from "@candyfight/shared/types";
import { TutorChapter, TutorInteraction } from "@candyfight/shared/tutorial/types";
import { TutorEngine } from "@candyfight/shared/tutorial/tutorEngine";
import { LocationActionsEnum } from "@candyfight/shared/enums";
import { WorkerMoveParams } from "@candyfight/shared/services/moves/workerPlacementService";
import { BoardDistrictsLayer } from "../board-component/BoardDistrictsLayer";
import { PlayerAreaComponent } from "../player-area-component/PlayerAreaComponent";
import { useBoardScale, getScaleStyle, getBoardContainerStyle } from "../board-component/hooks/useBoardScale";
import { MARKET_ROW_SIZE } from "@candyfight/shared/constants";
import { useActionOrchestrator, ActionOrchestratorRenderer } from "../../actions/action-orchestrator";
import { CombatPhaseDialog } from "../board-component/dialogs";
import { TutorOverlay } from "./TutorOverlay";
import { TutorDialog } from "./TutorDialog";
import { OpponentMoveCard } from "./OpponentMoveCard";
import { buildPlayersViewModel, buildFakeMatch } from "./tutorAdapters";
import { useT } from "../../i18n/useT";
// Side-effect import: registers the card-selection input handler used by the orchestrator.
import "../input-handlers/CardSelectionHandler";
import "./tutorial.css";

const HUMAN = "0";

export interface TutorControllerProps {
    chapter: TutorChapter;
    playerNames?: string[];
    onExit: () => void;
}

export const TutorController = ({ chapter, playerNames, onExit }: TutorControllerProps) => {
    const t = useT();
    const names = useMemo(() => playerNames ?? [t("tutorial.you"), t("tutorial.rival")], [playerNames, t]);
    // Engine is created once per chapter mount.
    const [engine] = useState(() => new TutorEngine(chapter.initialState()));
    const [snapshot, setSnapshot] = useState<GameState>(() => structuredClone(engine.state));
    const [stepIndex, setStepIndex] = useState(0);
    const [satisfied, setSatisfied] = useState(false);
    const [roundEnding, setRoundEnding] = useState(false);
    // For opponent steps: the reveal modal is shown first; once dismissed we focus the
    // location the opponent played at, then allow advancing.
    const [opponentSeen, setOpponentSeen] = useState(false);

    const { scale, outerRef } = useBoardScale();
    const actionOrchestrator = useActionOrchestrator();

    const step = chapter.steps[stepIndex];
    const interaction: TutorInteraction = step.interaction ?? { kind: "none" };
    const phase = step.phase ?? "mainPhase";

    const publish = useCallback(() => setSnapshot(structuredClone(engine.state)), [engine]);

    // Run the step's entry side effects (scripted opponent moves / setup), then
    // decide whether the Advance button starts enabled.
    useEffect(() => {
        step.onEnter?.(engine);
        publish();
        setRoundEnding(false);
        setOpponentSeen(false);
        setSatisfied(interaction.kind === "none" || interaction.kind === "confirmOpponent");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stepIndex]);

    const advance = useCallback(() => {
        if (stepIndex >= chapter.steps.length - 1) {
            onExit();
        } else {
            setStepIndex(i => i + 1);
        }
    }, [stepIndex, chapter.steps.length, onExit]);

    // Auto-advance once the requested action is performed. Narration ('none') and
    // opponent-reveal ('confirmOpponent') steps still wait for the Next button.
    const autoAdvances =
        step.advance === "auto" ||
        (interaction.kind !== "none" && interaction.kind !== "confirmOpponent");
    useEffect(() => {
        if (satisfied && autoAdvances) {
            const t = setTimeout(advance, 700);
            return () => clearTimeout(t);
        }
    }, [satisfied, autoAdvances, advance]);

    // ─── Input gating ──────────────────────────────────────────────────────────

    const onSelectCard = useCallback((card: Card) => {
        // Allow selecting the card the step is about (lights up the target location).
        const wantsCard =
            (interaction.kind === "selectCard" ||
                interaction.kind === "placeWorker" ||
                interaction.kind === "buyCard") && interaction.cardId === card.id;
        if (!wantsCard) return;

        const res = engine.selectCard(HUMAN, card.id);
        if (!res.ok) return;
        publish();
        if (interaction.kind === "selectCard") setSatisfied(true);
    }, [engine, interaction, publish]);

    const onLocationSelect = useCallback((districtIndex: number, locationIndex: number) => {
        if (interaction.kind !== "placeWorker" && interaction.kind !== "buyCard") return;
        if (interaction.districtIndex !== districtIndex || interaction.locationIndex !== locationIndex) return;
        const cardId = interaction.cardId;

        const completePlacement = (moveParams?: WorkerMoveParams) => {
            const res = engine.placeWorker(HUMAN, districtIndex, locationIndex, cardId, moveParams);
            if (!res.ok) return;
            publish();
            setSatisfied(true);
        };

        // Market: collect the trash cost, then the bought card — same flow as the
        // real board, so the player actually picks both.
        if (interaction.kind === "buyCard") {
            const location = engine.state.districts[districtIndex].locations[locationIndex];
            const trashCostAction = location.cost.actions?.find(
                a => a.actionId === LocationActionsEnum.TRASH || a.actionId === LocationActionsEnum.DISCARD
            );
            const marketRow = engine.state.cardMarket.slice(0, MARKET_ROW_SIZE);

            const marketTargetId = marketRow[interaction.marketIndex]?.id;
            actionOrchestrator.requestActionInput(trashCostAction!.actionId, {
                location,
                costAction: trashCostAction,
                lockToCardIds: interaction.trashCardIds,
                onComplete: costParams => {
                    actionOrchestrator.requestActionInput(LocationActionsEnum.BUY_CARD, {
                        marketCards: marketRow,
                        highlightCardId: marketTargetId,
                        lockToCardIds: marketTargetId ? [marketTargetId] : undefined,
                        onComplete: rewardParams => completePlacement({ costParams, rewardParams }),
                        onCancel: () => {},
                    });
                },
                onCancel: () => {},
            });
            return;
        }

        completePlacement();
    }, [engine, interaction, publish, actionOrchestrator]);

    const onReveal = useCallback(() => {
        if (interaction.kind !== "reveal") return;
        engine.reveal(HUMAN);
        publish();
        setSatisfied(true);
    }, [engine, interaction, publish]);

    const onEndRound = useCallback(() => {
        if (interaction.kind !== "endRound") return;
        setRoundEnding(true);
        setSatisfied(true);
    }, [interaction]);

    // Disable every location except the active placeWorker/buyCard target.
    const isLocationDisabled = useCallback((location: Location): boolean => {
        if (interaction.kind !== "placeWorker" && interaction.kind !== "buyCard") return true;
        const target = snapshot.districts[interaction.districtIndex]?.locations[interaction.locationIndex];
        return location !== target;
    }, [interaction, snapshot]);

    // ─── Reused board props ────────────────────────────────────────────────────

    const player = snapshot.players[HUMAN] as PlayerGameState;
    const selectedCard = player.selectedCard;
    const playersViewModel = useMemo(() => buildPlayersViewModel(snapshot), [snapshot]);
    const matchData = useMemo(() => buildFakeMatch(names), [names]);

    const movesShim = useMemo(() => ({
        selectCard: onSelectCard,
        pass: () => {},
        reveal: onReveal,
        placeWorker: () => {},
    }), [onSelectCard, onReveal]);

    const isLastStep = stepIndex >= chapter.steps.length - 1;

    // When a selection modal (trash / buy) is open, swap the narration for the
    // modal-specific text and lift the dialog above the modal.
    const pendingActionId = actionOrchestrator.pendingRequest?.actionId;
    const inTrashModal = pendingActionId === LocationActionsEnum.TRASH || pendingActionId === LocationActionsEnum.DISCARD;
    const inBuyModal = pendingActionId === LocationActionsEnum.BUY_CARD;
    const activeText =
        (inTrashModal && step.modalText?.trash) ? step.modalText.trash
        : (inBuyModal && step.modalText?.buy) ? step.modalText.buy
        : step.text;
    // The opponent reveal modal is shown first; while it's up we suppress board
    // signals and the narration dialog, then focus the played location once dismissed.
    const opponentModalOpen = !!step.opponent && !opponentSeen;
    const dialogElevated = phase === "combatPhase" || !!actionOrchestrator.pendingRequest || !!step.openPlayerModal;
    const activeGateHint = actionOrchestrator.pendingRequest ? undefined : step.gateHint;

    // While a selection modal is open, keep only the glow that targets a card
    // inside the modal (board arrows/glows would draw over the dimmed modal).
    const overlaySignals = opponentModalOpen
        ? []
        : actionOrchestrator.pendingRequest
            ? (step.signals ?? []).filter(s => s.kind === "glow" && s.anchor.startsWith("pile-card:"))
            : step.signals ?? [];
    // Elevate the overlay above the centered pile-preview when a glow targets a card
    // inside it (so hovering the Discard actually highlights the discarded card).
    const targetsPileCard = (step.signals ?? []).some(s => s.kind === "glow" && s.anchor.startsWith("pile-card:"));
    const overlayElevated = !!actionOrchestrator.pendingRequest || !!step.openPlayerModal || targetsPileCard;

    return (
        <div className="game-container">
            <div className="w-screen overflow-auto board-outer" ref={outerRef} style={getScaleStyle(scale)}>
                <div className="board-viewport">
                    <div style={getBoardContainerStyle(mapBg)} className="board-container relative mx-auto">
                        <BoardDistrictsLayer
                            districts={snapshot.districts}
                            playersViewModel={playersViewModel}
                            phase={phase}
                            matchData={matchData}
                            player={player}
                            selectedCard={selectedCard}
                            onLocationSelect={onLocationSelect}
                            isLocationDisabled={isLocationDisabled}
                            marketCards={snapshot.cardMarket.slice(0, MARKET_ROW_SIZE)}
                        />

                        {/* Card-selection prompts for trash cost / market buy */}
                        <ActionOrchestratorRenderer
                            pendingRequest={actionOrchestrator.pendingRequest}
                            player={player}
                            excludeCardId={selectedCard?.id}
                        />

                        <PlayerAreaComponent
                            G={snapshot}
                            playerView={playersViewModel}
                            moves={movesShim}
                            player={player}
                            selectedCard={selectedCard}
                            playerNames={names}
                            currentPlayerId={phase === "combatPhase" ? "all" : HUMAN}
                            autoOpenPlayerModalId={step.openPlayerModal}
                        />

                        {/* Real combat results dialog — driven by the `endRound` step */}
                        <CombatPhaseDialog
                            open={phase === "combatPhase"}
                            districts={snapshot.districts}
                            matchData={matchData}
                            isRoundEnding={roundEnding}
                            onEndRound={onEndRound}
                        />
                    </div>
                </div>
            </div>

            {/* Scripted opponent reveal — modal first; dismissing focuses the played location */}
            {opponentModalOpen && (
                <OpponentMoveCard
                    card={step.opponent!.card}
                    caption={step.opponent!.caption}
                    onDismiss={() => setOpponentSeen(true)}
                />
            )}

            {/* Board focus signals — hidden while a real phase modal owns the screen */}
            {phase !== "combatPhase" && (
                <TutorOverlay signals={overlaySignals} elevated={overlayElevated} />
            )}

            {/* Narration — hidden while the opponent reveal modal owns the screen */}
            {!opponentModalOpen && (
                <TutorDialog
                    chapter={chapter}
                    stepIndex={stepIndex}
                    text={activeText}
                    canAdvance={satisfied}
                    showAdvanceButton={!autoAdvances}
                    gateHint={activeGateHint}
                    onAdvance={advance}
                    onExit={onExit}
                    isLastStep={isLastStep}
                    elevated={dialogElevated}
                    anchorTopRight={dialogElevated}
                />
            )}
        </div>
    );
};
