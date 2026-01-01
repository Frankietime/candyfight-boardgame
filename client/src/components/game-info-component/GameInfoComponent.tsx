import { useEffect, useRef, useState } from "react";
import { useLobbyServices } from "../../services/lobbyServices";
import { useAppStore } from "../../store";
import { useQuery } from "@tanstack/react-query";
import "./GameInfoComponent.scss"
import { Ctx } from "boardgame.io";
import _ from "lodash";
import { GameState, PlayerViewModel } from "../../../../shared/types";

interface GameInfoComponentProps {
    ctx: Ctx;
    playersPublicInfo: PlayerViewModel[];
    G: GameState;
    chatMessages?: any[];
    sendChatMessage?: (message: string) => void;
    errorNotification?: string;
    children?: React.ReactNode;
    onLeaveMatch: () => void;
}

export const GameInfoComponent = ({
    ctx,
    G,
    chatMessages,
    sendChatMessage,
    children,
    playersPublicInfo,
    onLeaveMatch
}: GameInfoComponentProps) => {

    const { 
        matchData, 
        setMatchData,
        playerState, 
        setPlayerState 
    } = useAppStore();

    const { leaveMatch, getMatch } = useLobbyServices();

    const [errorNotification, setErrorNotification] = useState("");
    const [chatMessage, setChatMessage] = useState("");

    const chatRef = useRef<HTMLDivElement | null>(null);

    useQuery({
        queryKey: ["fetch-match-data"], 
        queryFn: () => getMatch(playerState.matchID)    
        .then((match) => {
            setMatchData(match);
            return match;
        },
        (error) => {
            setErrorNotification(error)
        }
        ),
        enabled: playerState != null && playerState.matchID != ""}
    );

    // Chat auto-scroll
    useEffect(() => {
        const el = chatRef.current;
        if (!el) return;
    
        const handleScroll = () => {
          const atBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight < 10;
          el.dataset.stick = atBottom ? "true" : "false";
        };
    
        el.addEventListener("scroll", handleScroll);
    
        const observer = new ResizeObserver(() => {
          if (el.dataset.stick === "true") {
            el.scrollTop = el.scrollHeight;
          }
        });
    
        observer.observe(el);
    
        el.scrollTop = el.scrollHeight;
        el.dataset.stick = "true";
    
        return () => {
          el.removeEventListener("scroll", handleScroll);
          observer.disconnect();
        };
    }, [chatMessages]);
      
    return (
        <div
            className="nes-container with-title is-dark font-nes"
            style={{
                position: "absolute",
                top: "15px",
                left: "25px",
                width: "310px",
                zIndex: 10,
                fontFamily: "'Press Start 2P', cursive",
                fontSize: "9px",
                paddingLeft: "0px",
                opacity: "0.7"
            }}
            >
            <h2 style={{ textDecoration: "underline", fontSize: 10}}>Game | {matchData.setupData.name}</h2>

            <div className="message-list">
                <div className="nes-text is-primary">
                    <p className="content-text">{playerState.name} | ID: {playerState.playerID}</p>
                </div>
                <div className="nes-text is-primary">
                    <p><strong>PHASE: </strong><span className="content-text">{_.kebabCase(ctx.phase).replace("-", " ").toUpperCase()}</ span></p>
                </div>

                <div className="nes-text is-primary">
                    <strong>TURN</strong>
                </div>
                <ul className="nes-list is-circle" style={{ marginLeft: "1rem" }}>
                
                {playersPublicInfo.map((p: PlayerViewModel, index: number) => (
                    <li
                        key={index}
                        className={ctx.currentPlayer == p.id ? "nes-text is-success" : "nes-text"}
                    >
                        {matchData.players[index].name} { p.hasRevealed ? "- REVEALED" : ""}
                    </li>
                ))}
                </ul>
                {/* <div className="nes-text is-primary">
                    <strong>Match ID:</strong> <p>{playerState.matchID}</p>
                </div>
                <div className="nes-text is-primary">
                    <strong>Creds:</strong> <p>{playerState.playerCredentials}</p>
                </div> */}

                {errorNotification && (
                    <div className="nes-text is-error">{errorNotification}</div>
                )}
            </div>

            {/* CHAT */}
            { sendChatMessage && (
                <div  
                    className=" with-title is-rounded is-dark"
                    style={{
                        marginTop: "1rem",
                        margin: "10px",
                        fontFamily: "'Press Start 2P', cursive",
                        scrollBehavior: "smooth",
                    }}
                >
                    <p className="title">Chat</p>

                    {/* Chat con alto fijo y scroll */}
                    <div
                        ref={chatRef}
                        className="chat-log"
                        style={{
                            marginTop: "1rem",
                            height: "300px",
                            overflowY: "auto",
                            paddingRight: "4px",
                        }}
                    >

                    {chatMessages != null &&
                        chatMessages.map((msj, index) => (
                        <p
                            key={index}
                            className={"nes-balloon " + (msj.sender == playerState.playerID ? "from-left" : "from-right")}
                            style={{
                            marginBottom: "1.5rem",
                            fontFamily: "'Press Start 2P', cursive",
                            fontSize: "10px",
                            lineHeight: "1.4",
                            color: "black",
                            marginLeft: msj.sender == playerState.playerID ? "0px" : "40px"
                            }}
                        >
                            <span className="nes-text is-info">
                            {matchData.players[msj.sender].name}:
                            </span>{" "}
                            {msj.payload}
                        </p>
                        ))}
                    </div>
                    <div className="nes-field" style={{ marginBottom: ".75rem" }}>
                        <input
                            type="text"
                            className="nes-input"
                            placeholder="..."
                            value={chatMessage}
                            onChange={(evt) => setChatMessage(evt.target.value)}
                            style={{ fontFamily: "'Press Start 2P', cursive" }}
                            onKeyDown={(event) => { 
                            if(event.code == "Enter") {
                                sendChatMessage(chatMessage);
                                setChatMessage(""); 
                            }}}
                        />
                    </div>
            
                    <button
                        type="button"
                        className="nes-btn is-primary"
                        style={{ fontFamily: "'Press Start 2P', cursive" }}
                        onClick={() => {
                            sendChatMessage(chatMessage);
                            setChatMessage("");
                        }}
                    >
                        Enviar
                    </button>
                </div>
            )}

            <button
                onClick={onLeaveMatch}
                type="button"
                className="nes-btn is-error"
                style={{ marginTop: "1rem", fontFamily: "'Press Start 2P', cursive" }}
            >
                Leave
            </button>
            {children}
        </div>
    )
}