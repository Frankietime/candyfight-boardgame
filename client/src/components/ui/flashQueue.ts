/**
 * Global stagger scheduler for stat-glow flashes.
 *
 * When one game event changes several counters at once (pay 2 candy, gain a
 * loot, hand shrinks…), their glow animations must play SEQUENTIALLY — each
 * one starting at most FLASH_STAGGER_MS after the previous — instead of all
 * bursting in parallel. Components claim a slot when they detect a change and
 * start their animation after the returned delay; when the board is quiet the
 * first claim starts immediately.
 */
export const FLASH_STAGGER_MS = 650;

let nextSlotAt = 0;

/** Returns how many ms the caller must wait before starting its flash. */
export const claimFlashSlot = (): number => {
    const now = performance.now();
    const startAt = Math.max(now, nextSlotAt);
    nextSlotAt = startAt + FLASH_STAGGER_MS;
    return startAt - now;
};
