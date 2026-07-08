/**
 * vs-Bots match helpers.
 *
 * A bot match runs entirely client-side over boardgame.io's `Local()`
 * transport: the human sits at seat '0' and `CandyGreedyBot` fills every
 * other seat. There is no server match behind it, so the lobby/match REST
 * endpoints must be bypassed — `BOT_MATCH_ID` is the sentinel that tells the
 * rest of the client to do that (synthetic match data, no leave call).
 */
import { LobbyAPI } from "boardgame.io";
import { CandyGreedyBot, withPlayDelay } from "@candyfight/shared/ai/CandyGreedyBot";

export const BOT_MATCH_ID = "vs-bots";

export const isBotMatch = (matchID?: string | null): boolean => matchID === BOT_MATCH_ID;

/** Pause before each bot move so the human can watch the transitions. */
export const BOT_PLAY_DELAY_MS = 1000;

/** Seats 1..n-1 → greedy bot class (with visible-move delay), for `Local({ bots })`. */
export const makeBots = (numPlayers: number): Record<string, typeof CandyGreedyBot> =>
    Object.fromEntries(
        Array.from({ length: numPlayers - 1 }, (_, i) => [String(i + 1), withPlayDelay(BOT_PLAY_DELAY_MS)])
    );

/** Synthetic LobbyAPI.Match so board components render without a server match. */
export const makeBotMatchData = (numPlayers: number, humanName: string): LobbyAPI.Match => ({
    matchID: BOT_MATCH_ID,
    gameName: "project-district",
    players: Array.from({ length: numPlayers }, (_, i) => ({
        id: i,
        name: i === 0 ? humanName : `🤖 Bot ${i}`,
    })),
    createdAt: Date.now(),
    updatedAt: Date.now(),
});
