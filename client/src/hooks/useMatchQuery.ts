import { useQuery } from "@tanstack/react-query";
import { LobbyAPI } from "boardgame.io";
import { useLobbyServices } from "../services/lobbyServices";

/**
 * React Query hook for fetching match data
 */
export function useMatchQuery(matchID: string | undefined) {
  const { getMatch } = useLobbyServices();

  return useQuery<LobbyAPI.Match>({
    queryKey: ["match", matchID],
    queryFn: () => getMatch(matchID!),
    enabled: !!matchID,
  });
}
