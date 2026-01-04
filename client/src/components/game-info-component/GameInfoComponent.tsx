import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../store";
import { Ctx } from "boardgame.io";
import { GameState, PlayerViewModel } from "@candyfight/shared/types";
import { useMatchQuery } from "../../hooks/useMatchQuery";

/**
 * Format phase name for display (replaces lodash kebabCase)
 * Example: "mainPhase" -> "MAIN PHASE"
 */
function formatPhase(phase: string | null): string {
    if (!phase) return "UNKNOWN";
    // Convert camelCase to space-separated uppercase
    return phase
        .replace(/([A-Z])/g, " $1")
        .trim()
        .toUpperCase();
}

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

    const { playerState } = useAppStore();

    // Fetch match data with React Query
    const { data: matchData, error: matchError } = useMatchQuery(playerState?.matchID);

    const [errorNotification, setErrorNotification] = useState("");
    const [chatMessage, setChatMessage] = useState("");

    const chatRef = useRef<HTMLDivElement | null>(null);

    // Show error notification if match fetch fails
    useEffect(() => {
        if (matchError) {
            const errorMessage = matchError instanceof Error ? matchError.message : String(matchError);
            setErrorNotification(errorMessage);
        }
    }, [matchError]);

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
            <h2 style={{ textDecoration: "underline", fontSize: 10}}>Game | {matchData?.setupData?.name ?? "Loading..."}</h2>

            <div className="message-list">
                <div className="nes-text is-primary">
                    <p className="content-text">{playerState.name} | ID: {playerState.playerID}</p>
                </div>
                <div className="nes-text is-primary">
                    <p><strong>PHASE: </strong><span className="content-text">{formatPhase(ctx.phase)}</span></p>
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
                        {matchData?.players?.[index]?.name ?? `Player ${index + 1}`} { p.hasRevealed ? "- REVEALED" : ""}
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
                            {matchData?.players?.[msj.sender]?.name ?? `Player ${msj.sender}`}:
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