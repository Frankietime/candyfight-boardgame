/**
 * mainPhase transition tests
 *
 * Covers the reported bug where:
 *   P1 reveals → P2 places Sword Master (+1 worker) → P2 reveals
 *   Expected: combatPhase
 *   Actual:   P1's turn restarts (stuck)
 *
 * Also covers similar phase-transition scenarios and relevant unit tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Client } from 'boardgame.io/client';
import { createTestGame, D3_CARD, D4_CARD, LOC } from './helpers/createTestGame';
import { revealPlayer, resetTurnState } from '../services/moves/phaseService';
import { isWorkerPlacementValid } from '../game-helper';
import { CharacterEnum } from '../enums';
import type { PlayerGameState } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Boots a 2-player client and advances past characterSelectionPhase into
 * mainPhase: every seat must pick a character before the game leaves the
 * selection phase, otherwise it stays stuck there and no mainPhase move runs.
 * Leaves control on the round's first player (seat "0").
 */
function makeClient(game = createTestGame()) {
    const client = Client({ game, numPlayers: 2, playerID: '0' });
    client.start();

    const chars = Object.values(CharacterEnum);
    for (let i = 0; i < 2; i++) {
        client.updatePlayerID(String(i));
        client.moves.selectCharacter(chars[i]);
    }
    client.updatePlayerID(client.getState()!.ctx.currentPlayer);
    return client;
}

/** Minimal PlayerGameState for unit tests */
function mockPlayer(overrides: Partial<PlayerGameState> = {}): PlayerGameState {
    return {
        id: '0',
        currentNumberOfWorkers: 2,
        maxNumberOfWorkers: 2,
        selectedCard: undefined,
        hasPlayedCard: false,
        hasRevealed: false,
        candy: 8,
        loot: 2,
        victoryPoints: 0,
        deck: [],
        hand: [],
        discardPile: [],
        trashPile: [],
        ...overrides,
    } as PlayerGameState;
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration tests – phase transitions via boardgame.io Client
// ─────────────────────────────────────────────────────────────────────────────

describe('mainPhase → combatPhase transitions', () => {

    it('baseline: both players reveal without placing → combatPhase', () => {
        const client = makeClient();

        expect(client.getState()!.ctx.phase).toBe('mainPhase');

        // P0 reveals (satisfies minMoves:1)
        client.moves.reveal();

        // P1 reveals
        client.updatePlayerID('1');
        client.moves.reveal();

        expect(client.getState()!.ctx.phase).toBe('combatPhase');
    });

    it('BUG SCENARIO: P0 places + passes, P1 places Sword Master + passes, both reveal → combatPhase', () => {
        const client = makeClient();

        // One action XOR reveal per turn: after placing a worker a player must
        // pass (they cannot also reveal on the same turn), then reveals later.

        // P0: place at Easy Job, then pass
        client.moves.placeWorker(LOC.EASY_JOB.districtIdx, LOC.EASY_JOB.locationIdx, D3_CARD);
        client.moves.pass();

        expect(client.getState()!.ctx.currentPlayer).toBe('1');

        // P1: place at Sword Master (gains +1 worker), then pass
        client.updatePlayerID('1');
        client.moves.placeWorker(LOC.SWORD_MASTER.districtIdx, LOC.SWORD_MASTER.locationIdx, D4_CARD);
        client.moves.pass();

        // Neither has revealed yet → back to P0 for a fresh (no-placement) turn
        expect(client.getState()!.ctx.currentPlayer).toBe('0');
        client.updatePlayerID('0');
        client.moves.reveal();

        // P1 reveals → all revealed → combatPhase
        client.updatePlayerID('1');
        client.moves.reveal();

        expect(client.getState()!.ctx.phase).toBe('combatPhase');
    });

    it('P0 reveals first (no placement), P1 places Sword Master + passes, then reveals → combatPhase', () => {
        const client = makeClient();

        // P0: reveal only
        client.moves.reveal();

        // P1: Sword Master, then pass (cannot reveal on the same turn)
        client.updatePlayerID('1');
        client.moves.placeWorker(LOC.SWORD_MASTER.districtIdx, LOC.SWORD_MASTER.locationIdx, D4_CARD);
        client.moves.pass();

        // No ghost turn: P0 already revealed, so the turn comes straight back to P1
        expect(client.getState()!.ctx.currentPlayer).toBe('1');
        client.moves.reveal();

        expect(client.getState()!.ctx.phase).toBe('combatPhase');
    });

    it('P0 places Sword Master + passes, then both reveal → combatPhase', () => {
        const client = makeClient();

        // P0: Sword Master, then pass
        client.moves.placeWorker(LOC.SWORD_MASTER.districtIdx, LOC.SWORD_MASTER.locationIdx, D4_CARD);
        client.moves.pass();

        // P1: reveal only
        client.updatePlayerID('1');
        client.moves.reveal();

        // Back to P0 for a fresh turn to reveal → all revealed → combatPhase
        expect(client.getState()!.ctx.currentPlayer).toBe('0');
        client.updatePlayerID('0');
        client.moves.reveal();

        expect(client.getState()!.ctx.phase).toBe('combatPhase');
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// Integration tests – Sword Master worker state
// ─────────────────────────────────────────────────────────────────────────────

describe('Sword Master worker count', () => {

    it('after placing Sword Master: candy -4, currentWorkers net same, maxWorkers +1', () => {
        const client = makeClient();

        const before = client.getState()!.G.players['0'];
        const initialCandy = (before as any).candy;
        const initialMaxWorkers = (before as any).maxNumberOfWorkers;
        const initialCurrentWorkers = (before as any).currentNumberOfWorkers;

        client.moves.placeWorker(LOC.SWORD_MASTER.districtIdx, LOC.SWORD_MASTER.locationIdx, D4_CARD);

        // After placing, read own state (still P0's turn – not yet revealed)
        const after = client.getState()!.G.players['0'] as any;

        expect(after.candy).toBe(initialCandy - 4);
        expect(after.maxNumberOfWorkers).toBe(initialMaxWorkers + 1);
        // Net workers: spent 1 (playCard), gained 1 (Sword Master reward) → same as before
        expect(after.currentNumberOfWorkers).toBe(initialCurrentWorkers);
    });

    it('Sword Master blocks a second placement in the same turn (hasPlayedCard)', () => {
        const client = makeClient();

        // P0 places Sword Master → hasPlayedCard = true
        client.moves.placeWorker(LOC.SWORD_MASTER.districtIdx, LOC.SWORD_MASTER.locationIdx, D4_CARD);

        const stateAfterFirst = client.getState()!.G.players['0'] as any;
        expect(stateAfterFirst.hasPlayedCard).toBe(true);

        // Second placement attempt should be rejected (INVALID_MOVE)
        // The location index 0 is a different location, but hasPlayedCard blocks it.
        const stateBefore = client.getState()!;
        client.moves.placeWorker(LOC.EASY_JOB.districtIdx, LOC.EASY_JOB.locationIdx, D3_CARD);
        const stateAfter = client.getState()!;

        // State must be unchanged (move was rejected)
        expect(stateAfter.G.players['0']).toEqual(stateBefore.G.players['0']);
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// Integration tests – pass mechanic
// ─────────────────────────────────────────────────────────────────────────────

describe('pass mechanic', () => {

    it('pass ends turn without revealing (requires prior worker placement)', () => {
        const client = makeClient();

        // Must place a worker first before passing is allowed
        client.moves.placeWorker(LOC.EASY_JOB.districtIdx, LOC.EASY_JOB.locationIdx, D3_CARD);
        client.moves.pass();

        expect(client.getState()!.ctx.currentPlayer).toBe('1');
        expect((client.getState()!.G.players['0'] as any).hasRevealed).toBe(false);
    });

    it('pass is blocked when no workers left — state unchanged (INVALID_MOVE)', () => {
        const baseGame = createTestGame();
        const zeroWorkerGame = {
            ...baseGame,
            setup: (ctx: any) => {
                const state = baseGame.setup!(ctx);
                // Set maxNumberOfWorkers=0 so playersSetup (maintenancePhase.onBegin) also resets to 0
                Object.values(state.players).forEach((p: any) => {
                    p.currentNumberOfWorkers = 0;
                    p.maxNumberOfWorkers = 0;
                });
                return state;
            },
        };
        const c = makeClient(zeroWorkerGame as any);

        const stateBefore = c.getState()!;
        c.moves.pass();
        const stateAfter = c.getState()!;

        // State must be unchanged and turn must not have advanced
        expect(stateAfter.G.players['0']).toEqual(stateBefore.G.players['0']);
        expect(stateAfter.ctx.currentPlayer).toBe('0');
    });

    it('no ghost turn: P0 reveals, P1 places + passes → custom order skips P0 → P1 gets turn back → P1 reveals → combatPhase', () => {
        const client = makeClient();

        // P0 reveals
        client.moves.reveal();
        expect((client.getState()!.G.players['0'] as any).hasRevealed).toBe(true);

        // P1 must place a worker before passing
        client.updatePlayerID('1');
        client.moves.placeWorker(LOC.SWORD_MASTER.districtIdx, LOC.SWORD_MASTER.locationIdx, D4_CARD);
        client.moves.pass();

        // No ghost turn: P1 gets the turn directly (P0 is skipped by order.next)
        expect(client.getState()!.ctx.currentPlayer).toBe('1');

        // P1 reveals → all revealed → combatPhase
        client.moves.reveal();
        expect(client.getState()!.ctx.phase).toBe('combatPhase');
    });

    it('multiple passes, then both reveal → combatPhase', () => {
        const client = makeClient();

        // P0 places then passes
        client.moves.placeWorker(LOC.EASY_JOB.districtIdx, LOC.EASY_JOB.locationIdx, D3_CARD);
        client.moves.pass();
        expect(client.getState()!.ctx.currentPlayer).toBe('1');

        // P1 places then passes
        client.updatePlayerID('1');
        client.moves.placeWorker(LOC.SWORD_MASTER.districtIdx, LOC.SWORD_MASTER.locationIdx, D4_CARD);
        client.moves.pass();
        expect(client.getState()!.ctx.currentPlayer).toBe('0');

        // P0 reveals
        client.updatePlayerID('0');
        client.moves.reveal();

        // P1 reveals
        client.updatePlayerID('1');
        client.moves.reveal();

        expect(client.getState()!.ctx.phase).toBe('combatPhase');
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests – pure functions
// ─────────────────────────────────────────────────────────────────────────────

describe('revealPlayer', () => {
    it('sets hasRevealed to true', () => {
        const player = mockPlayer({ hasRevealed: false });
        revealPlayer(player);
        expect(player.hasRevealed).toBe(true);
    });

    it('is idempotent when called twice', () => {
        const player = mockPlayer({ hasRevealed: true });
        revealPlayer(player);
        expect(player.hasRevealed).toBe(true);
    });
});

describe('resetTurnState', () => {
    it('resets hasPlayedCard and selectedCard', () => {
        const player = mockPlayer({ hasPlayedCard: true, selectedCard: { id: 'x' } as any });
        resetTurnState(player);
        expect(player.hasPlayedCard).toBe(false);
        expect(player.selectedCard).toBeUndefined();
    });

    it('does NOT reset hasRevealed', () => {
        const player = mockPlayer({ hasRevealed: true });
        resetTurnState(player);
        expect(player.hasRevealed).toBe(true);
    });
});

describe('isWorkerPlacementValid', () => {
    const validLocation = {
        takenByPlayerID: undefined,
        cost: { districtIconIds: ['LOC3'], resources: [] },
    } as any;

    const d3CardMinimal = { id: 'LOC3', districtIds: ['LOC3'] } as any;

    it('returns false when hasPlayedCard is true', () => {
        const player = mockPlayer({ hasPlayedCard: true });
        expect(isWorkerPlacementValid(player, validLocation, d3CardMinimal)).toBe(false);
    });

    it('returns false when no workers remain', () => {
        const player = mockPlayer({ currentNumberOfWorkers: 0 });
        expect(isWorkerPlacementValid(player, validLocation, d3CardMinimal)).toBe(false);
    });

    it('returns false when location is already taken', () => {
        const player = mockPlayer();
        const takenLoc = { ...validLocation, takenByPlayerID: '1' };
        expect(isWorkerPlacementValid(player, takenLoc, d3CardMinimal)).toBe(false);
    });

    it('returns true when all conditions are met', () => {
        const player = mockPlayer();
        expect(isWorkerPlacementValid(player, validLocation, d3CardMinimal)).toBe(true);
    });
});
