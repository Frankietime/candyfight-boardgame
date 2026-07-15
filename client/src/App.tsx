import "./App.css";
import { LobbyComponent } from "./components/lobby-component/LobbyComponent";
import { BoardComponent } from "./components/board-component/BoardComponent";
import { TutorialMode } from "./components/tutorial/TutorialMode";
import { ModLabScreen } from "./components/mod-lab/ModLabScreen";
import { useAppStore } from "./store";
import { useMemo } from "react";
import { Local, SocketIO } from "boardgame.io/multiplayer";
import { Client as ClientComponent} from "boardgame.io/react";
import { Game } from "@candyfight/shared/Game";
import { BACKEND_URL } from "./config";
import { SocketIOTransport } from "boardgame.io/dist/types/src/client/transport/socketio";
import { BOT_MATCH_ID, isBotMatch, makeBots } from "./botMatch";

export default function App() {

  const {
    playerState,

    tutorialOpen,
    setTutorialOpen,

    screen,

    botSeats,
    activeMod,
  } = useAppStore();

  // Pure memos: no store setState during render (that's a side effect, and
  // under StrictMode's double-invocation it created two live transports).
  const socketIOserver: (transportOpts: any) => SocketIOTransport = useMemo(
    () => SocketIO({ server: BACKEND_URL }),
    []
  );

  const GameClientComponent = useMemo(() => ClientComponent({
    game: Game,
    board: BoardComponent,
    multiplayer: socketIOserver,
    debug: false,
  }), [socketIOserver]);

  // vs-Bots: a fully client-side match over Local() with greedy bots on every
  // non-human seat. Rebuilt when the seat count changes (new bots object →
  // Local() spins up a fresh master). Local() can't carry setupData, so the
  // loaded cartridge is baked into the game via a setup closure.
  const BotClientComponent = useMemo(() => {
    if (!isBotMatch(playerState.matchID) || !botSeats) return null;
    const modGame = activeMod
      ? { ...Game, setup: (ctxAndPlugins: any) => (Game.setup as any)(ctxAndPlugins, { mod: activeMod }) }
      : Game;
    return ClientComponent({
      game: modGame,
      board: BoardComponent,
      multiplayer: Local({ bots: makeBots(botSeats) }),
      numPlayers: botSeats,
      debug: false,
    });
  }, [playerState.matchID, botSeats, activeMod]);

  const isGameInCourse = () => playerState.matchID != null && playerState.matchID != "";

  if (tutorialOpen) {
    return <TutorialMode onClose={() => setTutorialOpen(false)} />;
  }

  if (!isGameInCourse() && screen === "modLab") {
    return <ModLabScreen />;
  }

  return (
      <div className="flex justify-center nes-poiter">
        { !isGameInCourse() && GameClientComponent ?
          <LobbyComponent />
            :
          (BotClientComponent ?
            <BotClientComponent matchID={BOT_MATCH_ID} playerID="0" />
              :
            <GameClientComponent
              matchID={playerState.matchID}
              playerID={playerState.playerID ? playerState.playerID : "0"}
              credentials={playerState.playerCredentials ? playerState.playerCredentials : undefined}
            />
          )
        }
      </div>
  );
}
