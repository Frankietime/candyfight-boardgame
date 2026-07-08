/**
 * Tutorial system types — shared, pure (no React).
 *
 * A tutorial is a list of discrete {@link TutorChapter}s. Each chapter seeds a
 * deterministic {@link import("./tutorEngine").TutorEngine} state and runs an
 * ordered list of {@link TutorStep}s. Steps narrate a rule, focus attention with
 * {@link TutorSignal}s (glows / arrows), and either wait for the player to perform
 * an {@link TutorInteraction} or apply a scripted opponent action on advance.
 *
 * See `specs/tutorial-spec.md` for the design and `specs/RULEBOOK.md` for the rules.
 */

import { Card, GameState } from "../types";
import type { TutorEngine } from "./tutorEngine";

/**
 * Stable anchor id that the client maps to a `data-tutor-id` DOM attribute so the
 * signal overlay can position glows/arrows. Helpers below build the canonical ids;
 * the client and the chapters must agree on these exact strings.
 */
export type TutorAnchorId = string;

export const anchors = {
    handCard: (cardId: string): TutorAnchorId => `hand-card:${cardId}`,
    selectedCard: (): TutorAnchorId => `selected-card`,
    /** Located by board indices (location `Id`s are not unique in the data). */
    location: (districtIndex: number, locationIndex: number): TutorAnchorId =>
        `location:${districtIndex}:${locationIndex}`,
    district: (districtId: string): TutorAnchorId => `district:${districtId}`,
    market: (index: number): TutorAnchorId => `market:${index}`,
    workerPool: (playerId: string): TutorAnchorId => `worker-pool:${playerId}`,
    /** A player's deck/discard/trash pile counter. */
    pile: (playerId: string, kind: "deck" | "discard" | "trash"): TutorAnchorId =>
        `pile:${playerId}:${kind}`,
    /** A specific card shown in the centered pile-preview popover (hover). */
    pileCard: (cardId: string): TutorAnchorId => `pile-card:${cardId}`,
    characterInfo: (playerId: string): TutorAnchorId => `character-info:${playerId}`,
    /** The Signet-ability block inside a player's detail modal. */
    signetInfo: (playerId: string): TutorAnchorId => `signet-info:${playerId}`,
    resource: (playerId: string, resource: "candy" | "loot"): TutorAnchorId =>
        `resource:${playerId}:${resource}`,
    vp: (playerId: string): TutorAnchorId => `vp:${playerId}`,
    revealButton: (): TutorAnchorId => `reveal-button`,
    /** The narration dialog box — pointer arrows originate here. */
    tutorDialog: (): TutorAnchorId => `tutor-dialog`,
    passButton: (): TutorAnchorId => `pass-button`,
    drawButton: (): TutorAnchorId => `draw-button`,
} as const;

/**
 * A focus indicator drawn by the overlay for the duration of a step.
 * For arrows, `from` is optional: when omitted the overlay draws a short "pointer"
 * arrow into the target (used to simply point at a counter/element).
 */
export type TutorSignal =
    | { kind: "glow"; anchor: TutorAnchorId }
    | { kind: "arrow"; from?: TutorAnchorId; to: TutorAnchorId; label?: string };

/**
 * What the player must do for a step to complete. The client only enables the
 * matching board affordance; the engine validates the move actually matches.
 * `none` is pure narration (advance freely). `confirmOpponent` shows a scripted
 * opponent move and waits for the Next click.
 */
export type TutorInteraction =
    | { kind: "none" }
    | { kind: "selectCard"; cardId: string }
    | { kind: "placeWorker"; cardId: string; districtIndex: number; locationIndex: number }
    | { kind: "buyCard"; cardId: string; districtIndex: number; locationIndex: number; marketIndex: number; /** Force the trash-cost picks to exactly these hand cards. */ trashCardIds?: string[] }
    | { kind: "reveal" }
    | { kind: "confirmOpponent" }
    /** Satisfied by pressing "End Round" in the combat results dialog. */
    | { kind: "endRound" };

/** Game phase a step renders in; controls which real phase dialog is shown. */
export type TutorPhase = "mainPhase" | "combatPhase";

export type TutorStep = {
    id: string;
    /** Plain-language narration shown in the dialog. */
    text: string;
    /**
     * Phase the board renders in for this step (default `mainPhase`).
     * `combatPhase` opens the real {@link import("../../client").CombatPhaseDialog}
     * with the results table + End Round button.
     */
    phase?: TutorPhase;
    /** Glows/arrows active while this step is on screen. */
    signals?: TutorSignal[];
    /** Gate for the Advance button. Omitted ⇒ `{ kind: "none" }`. */
    interaction?: TutorInteraction;
    /**
     * Side effect applied when the step is entered — used to play scripted
     * opponent moves or set up board state for the lesson.
     */
    onEnter?: (engine: TutorEngine) => void;
    /**
     * Center-screen reveal of a scripted opponent action accompanying this step
     * (shown by {@link import("../../client").OpponentMoveCard}).
     */
    opponent?: { card?: Card; caption: string };
    /** Hint shown under the gated Next button while the interaction is unmet. */
    gateHint?: string;
    /**
     * Force-open a player's detail modal for the duration of this step (by player id)
     * so signals can glow elements inside it (e.g. the Signet ability block).
     */
    openPlayerModal?: string;
    /**
     * For `buyCard` steps: narration shown while each selection modal is open,
     * overriding `text`. `text` itself is the overview shown before the modals.
     */
    modalText?: { trash?: string; buy?: string };
    /**
     * 'button' (default): show the Next button once the interaction is satisfied.
     * 'auto': advance immediately when the interaction completes.
     */
    advance?: "button" | "auto";
};

export type TutorChapter = {
    id: string;
    title: string;
    /** One-line summary for the chapter menu. */
    summary: string;
    /** Deterministic seed state for this chapter. */
    initialState: () => GameState;
    steps: TutorStep[];
};

/** Result of an engine move attempt; drives interaction gating. */
export type TutorMoveResult = { ok: boolean; reason?: string };
