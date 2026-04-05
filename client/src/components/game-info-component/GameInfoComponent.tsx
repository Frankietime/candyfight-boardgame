import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "../../store";
import { Ctx } from "boardgame.io";
import { Card, GameState, LogEntry, PlayerViewModel } from "@candyfight/shared/types";
import { useMatchQuery } from "../../hooks/useMatchQuery";
import { CardMini } from "../card-components/CardMini";

// Neobrutalist design tokens
const nb = {
    bg: '#e0d4fc',
    cardBg: '#ffffff',
    border: '2px solid #000',
    borderRight: '2px solid #000',
    font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
    accent: '#fef08a',
    red: '#ef4444',
};

// Panel dimensions — single source of truth used by CardPopover offset
const PANEL_W = 330;       // expanded width (264 * 1.25)
const COLLAPSED_W = 70;    // collapsed width (56 * 1.25)
const LEFT_BORDER = 4;     // expanded left border px

function formatPhase(phase: string | null): string {
    if (!phase) return "UNKNOWN";
    return phase.replace(/([A-Z])/g, " $1").trim().toUpperCase();
}

interface GameInfoComponentProps {
    ctx: Ctx;
    playersPublicInfo: PlayerViewModel[];
    G: GameState;
    onLeaveMatch: () => void;
}

export const GameInfoComponent = ({
    ctx,
    playersPublicInfo,
    G,
    onLeaveMatch,
}: GameInfoComponentProps) => {
    const { playerState } = useAppStore();
    const { data: matchData } = useMatchQuery(playerState?.matchID);
    const [open, setOpen] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "i") {
                e.preventDefault();
                setOpen(prev => !prev);
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, []);


    const label: React.CSSProperties = {
        fontSize: "14px",
        fontWeight: 900,
        textTransform: "uppercase" as const,
        letterSpacing: "0.08em",
        color: "#555",
        marginBottom: 5,
    };

    const divider: React.CSSProperties = {
        borderTop: "2px solid #000",
        margin: "15px 0",
    };

    const sidebarBase: React.CSSProperties = {
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        zIndex: 10,
        fontFamily: nb.font,
        display: "flex",
        flexDirection: "column",
    };

    // Collapsed: full-height narrow strip flush to left edge
    if (!open) {
        return (
            <div
                ref={sidebarRef}
                style={{
                    ...sidebarBase,
                    width: COLLAPSED_W,
                    backgroundColor: nb.bg,
                    borderRight: nb.borderRight,
                    cursor: "pointer",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    paddingTop: 20,
                    gap: 12,
                }}
                onClick={() => setOpen(true)}
                title="Open game info"
            >
                <span style={{ fontSize: "28px", fontWeight: 900 }}>▶</span>
                <span
                    style={{
                        fontSize: "13px",
                        fontWeight: 900,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        color: "#333",
                    }}
                >
                    INFO
                </span>
                <span
                    style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        color: "#888",
                        letterSpacing: "0.05em",
                        marginTop: 5,
                    }}
                >
                    ^I
                </span>
            </div>
        );
    }

    return (
        <div
            ref={sidebarRef}
            style={{
                ...sidebarBase,
                width: PANEL_W,
                backgroundColor: nb.cardBg,
                borderRight: nb.borderRight,
                borderLeft: `${LEFT_BORDER}px solid #000`,
            }}
        >
            {/* Header */}
            <div
                style={{
                    backgroundColor: nb.bg,
                    borderBottom: nb.border,
                    padding: "15px 15px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexShrink: 0,
                }}
            >
                <span style={{ fontSize: "18px", fontWeight: 900, letterSpacing: "0.05em" }}>
                    🍬 CANDY FIGHT
                </span>
                <button
                    onClick={() => setOpen(false)}
                    style={{
                        border: nb.border,
                        backgroundColor: "#fff",
                        boxShadow: "2px 2px 0 #000",
                        width: 35,
                        height: 35,
                        cursor: "pointer",
                        fontWeight: 900,
                        fontSize: "18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                        fontFamily: nb.font,
                        flexShrink: 0,
                    }}
                    title="Collapse"
                >
                    ◀
                </button>
            </div>

            {/* Body — flex column so log can fill remaining space */}
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

                {/* Static content — fixed height */}
                <div style={{ padding: "15px 18px", flexShrink: 0 }}>

                    {/* Match name */}
                    <div style={label}>Match</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: 12, wordBreak: "break-word" }}>
                        {matchData?.setupData?.name ?? "Loading…"}
                    </div>

                    {/* Player */}
                    <div style={label}>You</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: 12 }}>
                        {playerState.name}
                        <span style={{ fontSize: "14px", color: "#888", marginLeft: 5 }}>
                            #{playerState.playerID}
                        </span>
                    </div>

                    <div style={divider} />

                    {/* Phase */}
                    <div style={label}>Phase</div>
                    <div
                        style={{
                            fontSize: "15px",
                            fontWeight: 700,
                            marginBottom: 12,
                            padding: "5px 10px",
                            backgroundColor: nb.accent,
                            border: nb.border,
                            display: "inline-block",
                        }}
                    >
                        {formatPhase(ctx.phase)}
                    </div>

                    <div style={divider} />

                    {/* Turn order */}
                    <div style={{ ...label, marginBottom: 8 }}>Turn Order</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {playersPublicInfo.map((p, index) => {
                            const isCurrent = ctx.currentPlayer === p.id;
                            const name = matchData?.players?.[index]?.name ?? `Player ${index + 1}`;

                            return (
                                <div
                                    key={p.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        padding: "5px 10px",
                                        border: isCurrent ? nb.border : "2px solid transparent",
                                        backgroundColor: isCurrent ? nb.accent : "transparent",
                                        fontSize: "16px",
                                        fontWeight: isCurrent ? 900 : 600,
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: "50%",
                                            backgroundColor: playerDotColor(p.id),
                                            border: "1px solid #000",
                                            flexShrink: 0,
                                        }}
                                    />
                                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {name}
                                    </span>
                                    {p.hasRevealed && (
                                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#555" }}>REVEALED</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Game log — takes all remaining height */}
                <GameLog entries={G.log} playerColors={playerColors} matchPlayers={matchData?.players} />
            </div>

            {/* Leave button — pinned to bottom */}
            <div style={{ padding: "15px 18px", borderTop: nb.border, flexShrink: 0 }}>
                <LeaveButton onClick={onLeaveMatch} />
            </div>
        </div>
    );
};

const playerColors = ["#ef4444", "#22c55e", "#a855f7", "#eab308"];
function playerDotColor(id: string): string {
    return playerColors[parseInt(id)] ?? "#888";
}

interface GameLogProps {
    entries: LogEntry[];
    playerColors: string[];
    matchPlayers?: { id: number; name?: string }[];
}

const GameLog = ({ entries, playerColors, matchPlayers }: GameLogProps) => {
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [entries.length]);

    const playerName = (id: string) =>
        matchPlayers?.[parseInt(id)]?.name ?? `P${parseInt(id) + 1}`;

    return (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "0 18px 15px", borderTop: nb.border }}>
            <div
                style={{
                    fontSize: "14px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#555",
                    margin: "12px 0 8px",
                    flexShrink: 0,
                }}
            >
                Game Log
            </div>
            <div
                ref={logRef}
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    border: nb.border,
                    padding: "8px 10px",
                    backgroundColor: "#fafafa",
                }}
            >
                {entries.length === 0 && (
                    <span style={{ fontSize: "13px", color: "#aaa", fontStyle: "italic" }}>
                        No actions yet
                    </span>
                )}
                {entries.map(entry => {
                    const isSystem = !entry.playerID || entry.type === 'phase';
                    const isCombat = entry.type === 'combat';
                    const isEffect = entry.type === 'effect';
                    const dotColor = playerColors[parseInt(entry.playerID)] ?? "#888";

                    if (isSystem && !isCombat) {
                        return (
                            <div
                                key={entry.id}
                                style={{
                                    fontSize: "13px",
                                    color: "#888",
                                    fontStyle: "italic",
                                    textAlign: "center",
                                    padding: "2px 0",
                                }}
                            >
                                {entry.message}
                            </div>
                        );
                    }

                    return (
                        <div
                            key={entry.id}
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 5,
                                fontSize: isEffect ? "13px" : "14px",
                                color: isEffect ? "#666" : "#111",
                                fontWeight: isEffect ? 400 : 600,
                                paddingLeft: isEffect ? 18 : 0,
                            }}
                        >
                            {!isEffect && (
                                <span
                                    style={{
                                        width: 9,
                                        height: 9,
                                        borderRadius: "50%",
                                        backgroundColor: dotColor,
                                        border: "1px solid #000",
                                        flexShrink: 0,
                                        marginTop: 4,
                                    }}
                                />
                            )}
                            <span>
                                {!isEffect && entry.playerID && (
                                    <strong style={{ marginRight: 3 }}>
                                        {playerName(entry.playerID)}
                                    </strong>
                                )}
                                <LogMessage entry={entry} />
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/** Renders a log message, replacing the card name with a hoverable CardLink when a card is attached. */
const LogMessage = ({ entry }: { entry: LogEntry }) => {
    if (!entry.card) return <>{entry.message}</>;

    const cardName = entry.card.name;
    const idx = entry.message.indexOf(cardName);
    if (idx === -1) return <>{entry.message}</>;

    const before = entry.message.slice(0, idx);
    const after = entry.message.slice(idx + cardName.length);

    return (
        <>
            {before}
            <CardLink card={entry.card} />
            {after}
        </>
    );
};

const CardLink = ({ card }: { card: Card }) => {
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

    return (
        <>
            <span
                onMouseEnter={(e) => setPos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setPos(null)}
                style={{
                    fontWeight: 700,
                    textDecoration: "underline dotted #5b21b6",
                    color: "#5b21b6",
                    cursor: "help",
                }}
            >
                {card.name}
            </span>
            {pos && createPortal(
                <CardPopover card={card} anchorY={pos.y} />,
                document.body
            )}
        </>
    );
};

const CardPopover = ({ card, anchorY }: { card: Card; anchorY: number }) => {
    const SIDEBAR_OFFSET = PANEL_W + LEFT_BORDER;
    const CARD_W = 105;
    const CARD_H = 157;

    return (
        <div
            style={{
                position: "fixed",
                left: SIDEBAR_OFFSET + 8,
                top: Math.max(8, Math.min(anchorY - CARD_H / 2, window.innerHeight - CARD_H - 8)),
                boxShadow: "5px 5px 0 #000",
                zIndex: 100,
                pointerEvents: "none",
            }}
        >
            <CardMini card={card} width={CARD_W} height={CARD_H} />
        </div>
    );
};

const LeaveButton = ({ onClick }: { onClick: () => void }) => {
    const [pressed, setPressed] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            onMouseLeave={() => setPressed(false)}
            style={{
                width: "100%",
                border: nb.border,
                boxShadow: pressed ? "none" : "4px 4px 0 #000",
                transform: pressed ? "translate(4px, 4px)" : undefined,
                padding: "11px 0",
                fontSize: "16px",
                fontFamily: nb.font,
                fontWeight: 900,
                cursor: "pointer",
                backgroundColor: nb.red,
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
            }}
        >
            Leave Match
        </button>
    );
};
