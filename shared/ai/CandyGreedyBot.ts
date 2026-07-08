/**
 * CandyGreedyBot — the PRIMARY bot for solo prototype testing.
 *
 * A 1-ply greedy player: for every legal move from `enumerate`, it applies the
 * move to a cloned state through the real game reducer and scores the resulting
 * state with `scoreState`, then plays the highest-scoring move. No playouts →
 * moves are effectively instant, which matters when 3 bots act every round.
 *
 * It reuses the exact `enumerate` + `objectives` an `MCTSBot` would, so
 * upgrading later is a drop-in swap.
 */
import { Bot } from "boardgame.io/ai";
import { CreateGameReducer } from "boardgame.io/internal";
import type { Game } from "boardgame.io";
import { scoreState } from "./botObjectives";
import { enumerate as candyEnumerate } from "./botEnumerate";

type BotCtorArgs = {
    enumerate?: (G: any, ctx: any, playerID?: string) => any[];
    seed?: string | number;
    game: Game;
};

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export class CandyGreedyBot extends Bot {
    private reducer: (state: any, action: any) => any;
    /** Pause before each move so humans can watch the transitions/animations.
     *  0 in tests; the client raises it via `withPlayDelay`. */
    protected playDelayMs = 0;

    constructor({ enumerate, seed, game }: BotCtorArgs) {
        super({ enumerate: enumerate ?? candyEnumerate, seed } as any);
        this.reducer = CreateGameReducer({ game });
    }

    async play(state: any, playerID: string) {
        if (this.playDelayMs > 0) await sleep(this.playDelayMs);
        return this.decide(state, playerID);
    }

    private decide(state: any, playerID: string) {
        const { G, ctx } = state;
        // Bot.enumerate wraps { move, args } into dispatchable redux actions.
        const actions: any[] = this.enumerate(G, ctx, playerID);
        if (actions.length === 0) return Promise.resolve({ action: null });

        let bestScore = -Infinity;
        let bestActions: any[] = [];

        for (const action of actions) {
            const next = this.reducer(state, action);
            const score = scoreState(next.G, next.ctx, playerID);
            if (score > bestScore) {
                bestScore = score;
                bestActions = [action];
            } else if (score === bestScore) {
                bestActions.push(action);
            }
        }

        // Break ties with the bot's seeded RNG so different seats vary.
        const action = this.random(bestActions);
        return Promise.resolve({ action });
    }
}

/** Convenience factory (tests / manual wiring). */
export const createCandyGreedyBot = (game: Game, seed?: string | number) =>
    new CandyGreedyBot({ game, seed });

/**
 * Bot class with a fixed pre-move delay, for `Local({ bots })` — the transport
 * instantiates bot classes itself with fixed args, so the delay is baked into
 * the class instead of passed to the constructor.
 */
export const withPlayDelay = (ms: number): typeof CandyGreedyBot =>
    class extends CandyGreedyBot {
        protected override playDelayMs = ms;
    };
