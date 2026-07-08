/**
 * Deterministic stand-in for boardgame.io's `random` plugin surface, used by the
 * TutorEngine so deck order and draws are fully scripted/reproducible.
 *
 * The shared services only depend on `random.Shuffle`. Here `Shuffle` is the
 * identity (preserves order) — chapters arrange decks explicitly, so we never
 * want the engine to reorder them.
 */
export type DeterministicRandom = {
    Shuffle: <T>(deck: T[]) => T[];
    D6: () => number;
    Number: () => number;
};

export const createDeterministicRandom = (): DeterministicRandom => ({
    Shuffle: <T>(deck: T[]): T[] => [...deck],
    D6: () => 1,
    Number: () => 0,
});
