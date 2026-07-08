import "./App.css";
import { LobbyComponent } from "./components/lobby-component/LobbyComponent";
import { BoardComponent } from "./components/board-component/BoardComponent";
import { TutorialMode } from "./components/tutorial/TutorialMode";
import { useAppStore } from "./store";
import { useT } from "./i18n/useT";
import { LanguageToggle } from "./i18n/LanguageToggle";
import { useEffect, useMemo } from "react";
import { Local, SocketIO } from "boardgame.io/multiplayer";
import { Client as ClientComponent} from "boardgame.io/react";
import { Game } from "@candyfight/shared/Game";
import { _ClientImpl } from "boardgame.io/dist/types/src/client/client";
import { BACKEND_URL } from "./config";
import { SocketIOTransport } from "boardgame.io/dist/types/src/client/transport/socketio";
import { BOT_MATCH_ID, isBotMatch, makeBots } from "./botMatch";

export default function App() {

  const {
    client,
    setClient,

    playerState,
    server,
    setServer,

    tutorialOpen,
    setTutorialOpen,

    botSeats,
  } = useAppStore();

  const t = useT();

  let socketIOserver: (transportOpts: any) => SocketIOTransport = useMemo(() => { 
    
    if (server != null && server.length == 1)
      return server;

    const _server = SocketIO({ server: BACKEND_URL });
    setServer(_server);
    return _server; 

  }, []);
  
  const GameClientComponent = useMemo(() => {
    // server = SocketIO({ server: BACKEND_URL });
    if (client == null || client.defaultProps == null || client.defaultProps.matchID == null) {
      const gameClientComponent = ClientComponent({ 
        game: Game, 
        board: BoardComponent,
        multiplayer: socketIOserver!,
        debug: false,
      });   
      
      setClient(gameClientComponent);

      return gameClientComponent;
    } else {
      return client;
    }
  }, []);

  // vs-Bots: a fully client-side match over Local() with greedy bots on every
  // non-human seat. Rebuilt when the seat count changes (new bots object →
  // Local() spins up a fresh master).
  const BotClientComponent = useMemo(() => {
    if (!isBotMatch(playerState.matchID) || !botSeats) return null;
    return ClientComponent({
      game: Game,
      board: BoardComponent,
      multiplayer: Local({ bots: makeBots(botSeats) }),
      numPlayers: botSeats,
      debug: false,
    });
  }, [playerState.matchID, botSeats]);

  const isGameInCourse = () => playerState.matchID != null && playerState.matchID != "";

  if (tutorialOpen) {
    return <TutorialMode onClose={() => setTutorialOpen(false)} />;
  }

  return (
      <div className="flex justify-center nes-poiter">
        { !isGameInCourse() && GameClientComponent ?
          <>
            <LobbyComponent />
            <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 50, display: "flex", alignItems: "center", gap: 12 }}>
              <LanguageToggle />
              <button
                onClick={() => setTutorialOpen(true)}
                style={{
                  border: "2px solid #000",
                  boxShadow: "4px 4px 0 #000",
                  backgroundColor: "#fef08a",
                  padding: "12px 20px",
                  fontWeight: 900,
                  fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                🍬 {t("lobby.howToPlay")}
              </button>
            </div>
          </>
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
