import { LobbyAPI } from "boardgame.io";
import { GAME_NAME } from "@candyfight/shared/constants";
import { PlayerState } from "@candyfight/shared/types";
import { useLobby } from "../lib/LobbyProvider";

export const useLobbyServices = () => {
    const lobby = useLobby();

    const getMatch = async (matchID: string): Promise<LobbyAPI.Match> => {
        return await lobby.getMatch(
                GAME_NAME, 
                matchID
            );
    }

    const leaveMatch = async (playerState: PlayerState) => { 
        return await lobby.leaveMatch(
                GAME_NAME, 
                playerState.matchID, 
                {
                    playerID: playerState.playerID,
                    credentials: playerState.playerCredentials
                }
            )
    }

    const listMatches = async (): Promise<LobbyAPI.MatchList> => await lobby.listMatches(GAME_NAME);

    const createMatch = async (numPlayers: number, setupData: any): Promise<any> => {
        return await lobby.createMatch(
            GAME_NAME,
            {
                numPlayers,
                setupData: setupData
            }
        )
    }

    const joinMatch = async (matchID: string, body: any) => {
        return await lobby.joinMatch(
            GAME_NAME,
            matchID,
            body
        )
    }

    return {
        getMatch,
        leaveMatch,
        listMatches,
        createMatch,
        joinMatch
    }
}