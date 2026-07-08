/**
 * Adapters that synthesize the props the real board components expect
 * (playersViewModel, a LobbyAPI.Match) from a plain tutorial GameState — so the
 * tutorial reuses the production board UI rather than duplicating it.
 */
import { LobbyAPI } from "boardgame.io";
import { GameState, PlayerViewModel } from "@candyfight/shared/types";
import { toPublicPlayer } from "@candyfight/shared/services/playerViewService";

/** Public view models for every player (presence display, enemy panels). */
export const buildPlayersViewModel = (G: GameState): PlayerViewModel[] =>
    Object.values(G.players).map(toPublicPlayer);

/** Minimal LobbyAPI.Match the board components read for player names / match title. */
export const buildFakeMatch = (playerNames: string[], matchName = "Tutorial"): LobbyAPI.Match =>
    ({
        matchID: "tutorial",
        players: playerNames.map((name, id) => ({ id, name })),
        setupData: { name: matchName },
        createdAt: 0,
        updatedAt: 0,
        gameName: "candy-fight-tutorial",
    } as unknown as LobbyAPI.Match);
