import { useQuery } from "@tanstack/react-query";
import { LobbyAPI } from "boardgame.io";
import { useLobbyServices } from "../services/lobbyServices";
import { isBotMatch, makeBotMatchData } from "../botMatch";
import { useAppStore } from "../store";

/**
 * React Query hook for fetching match data.
 *
 * vs-Bots matches are client-side only (Local transport, no server match),
 * so they resolve to synthetic match data instead of hitting the lobby API.
 */
export function useMatchQuery(matchID: string | undefined) {
  const { getMatch } = useLobbyServices();

  return useQuery<LobbyAPI.Match>({
    queryKey: ["match", matchID],
    queryFn: () => {
      if (isBotMatch(matchID)) {
        const { botSeats, playerState } = useAppStore.getState();
        return Promise.resolve(makeBotMatchData(botSeats ?? 4, playerState.name));
      }
      return getMatch(matchID!);
    },
    enabled: !!matchID,
    refetchInterval: (query) => {
      const players = query.state.data?.players;
      const allJoined = players?.every((p) => !!p.name);
      return allJoined ? false : 3000;
    },
  });
}
