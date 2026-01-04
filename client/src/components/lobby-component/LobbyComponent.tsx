import { useEffect, useState } from 'react';
import { useAppStore } from '../../store';
import { useLobbyStore } from './store';
import { useLobbyServices } from '../../services/lobbyServices';
import { BACKEND_URL } from '../../config';
import { UpdateIcon } from "@radix-ui/react-icons"
import { Button } from '@radix-ui/themes';
import { getRandomPlayerName } from '@candyfight/shared/services/moves/playerServices';
import { generateBattleEvent } from './helper';


export const LobbyComponent = () => {

  const {
    createMatch,
    joinMatch,
    listMatches,
  } = useLobbyServices();

  const {
    playerState,
    setPlayerState
  } = useAppStore();

  const {
    matchLore,
    setMatchLore,
    matchList,
    setMatchList
  } = useLobbyStore();

  const [numberOfPlayers, setNumberOfPlayers] = useState(2);

  // Polling - reduced from 500ms to 3000ms for better performance
  useEffect(() => {
      // Initial fetch
      listMatches().then((data) => setMatchList(data));

      // TODO: implement websockets instead of polling
      const intervalId = setInterval(() => {
        listMatches()
          .then((data) => setMatchList(data))
      }, 500);
      return () => clearInterval(intervalId);
  }, []);

  const onCreateMatch = async () => {
    return await createMatch(
      numberOfPlayers, 
      {
        name: useLobbyStore.getState().matchLore.title, 
        playerName: useAppStore.getState().playerState.name
      }       
    ).then((res) =>  res);
  }

  const onJoinMatch = async (matchID: string) => {
    const { playerCredentials, playerID } = await joinMatch(
      matchID,
      {
        playerName: useAppStore.getState().playerState.name,
      }
    );

    // Set player state - React Query will fetch match data automatically
    useAppStore.getState().setPlayerState({
      ...useAppStore.getState().playerState,
      matchID,
      playerID,
      playerCredentials
    });
  }

  const isLobbyClientLoaded = () => true;

  const onRemoveMatch = async (matchID: string) => {
    await fetch(`${BACKEND_URL}/admin/matches/${matchID}`, {
      method: 'DELETE',
    });
  };

  return (
    <>
      { isLobbyClientLoaded() && (
        <div className="max-w-md mx-auto p-4">
          <h1 className="text-xl font-semibold">Lobby</h1>

          {/* Player name */}
          <div className="mt-4">
            <label htmlFor="playerName" className="text-sm" style={{display: "block"}}>Player Name</label>
            <input
              id="playerName"
              value={playerState.name}
              onChange={(e) => setPlayerState({ ...playerState, name: e.target.value })}
              className="mt-1 w-full border rounded px-2 py-1"
              placeholder="Tu nombre"
              style={{ width: "350px", display: "inline-block"}}
            />
            <div style={{display: "inline", marginLeft: "15px"}}>
              <Button onClick={() => setPlayerState({
                ...playerState,
                name: getRandomPlayerName()
              })}>
                <UpdateIcon />
              </Button>
            </div>
          </div>

          {/* Ongoing matches */}
          <div className="mt-6">
            <h2 className="text-base font-medium">Ongoing Matches</h2>

            {matchList && matchList.matches.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {matchList.matches.map((match /*: LobbyAPI.Match */) => {
                  const players = match.players.filter(p => p.name).map(p => p.name).join(", ");
                  const emptySeats = match.players.filter(p => !p.name).length;

                  return (
                    <li key={match.matchID} className="border rounded p-3">
                      <div className="text-sm font-semibold">
                        {match.setupData?.name ?? "Unnamed match"}
                      </div>
                      <div className="text-sm text-gray-600">
                        Created by: {match.setupData?.playerName ?? "—"}
                      </div>
                      <div className="mt-1 text-sm">ID: {match.matchID}</div>
                      <div className="text-sm">Players: {players || "—"}</div>
                      <div className="text-sm">Empty seats: {emptySeats}</div>

                      <button
                        onClick={() => onJoinMatch(match.matchID)}
                        disabled={emptySeats === 0}
                        className="mt-2 w-full rounded bg-blue-600 px-3 py-1.5 text-white text-sm disabled:opacity-60"
                      >
                        Join
                      </button>
                      <button
                        onClick={() => onRemoveMatch(match.matchID)}
                        className="mt-2 w-full rounded bg-red-600 px-3 py-1.5 text-white text-sm disabled:opacity-60"
                      >
                        Remove
                      </button>

                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-gray-600">-</p>
            )}
          </div>

          {/* Create match */}
          <div className="mt-6">
            <h2 className="text-base font-medium">Create Match</h2>
            <label htmlFor="matchName" className="sr-only">Match Name</label>
            <input
              id="matchName"
              value={matchLore.title}
              onChange={(e) => setMatchLore({...matchLore, title: e.target.value})}
              className="mt-2 w-full border rounded px-2 py-1"
              placeholder="Nombre de la partida"
              style={{
                width: "300px",
                marginBottom: "30px"
              }}
            />
            <div style={{display: "inline", marginLeft: "15px"}}>
              {/* <Tooltip content={matchLore.description}> */}
                <Button style={{ width: "90px" }} onClick={() => {setMatchLore(generateBattleEvent())}}>
                  <UpdateIcon />
                  Lore
                </Button>
              {/* </Tooltip> */}
            </div>
            <div>
            </div>
            <button
              onClick={onCreateMatch}
              className="mt-2 w-full rounded bg-emerald-600 px-3 py-1.5 text-white text-sm"
            >
              Create Match
            </button>
          </div>
        </div>

      )}      
    </>
  );
}