import { useState } from "react";
import { useAppStore } from "../../store";
import { Ctx } from "boardgame.io";
import { GameState, PlayerViewModel } from "@candyfight/shared/types";
import { useMatchQuery } from "../../hooks/useMatchQuery";

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
    onLeaveMatch,
}: GameInfoComponentProps) => {
    const { playerState } = useAppStore();
    const { data: matchData } = useMatchQuery(playerState?.matchID);
    const [open, setOpen] = useState(false);

    const label: React.CSSProperties = {
        fontSize: "9px",
        fontWeight: 900,
        textTransform: "uppercase" as const,
        letterSpacing: "0.08em",
        color: "#555",
        marginBottom: 3,
    };

    const divider: React.CSSProperties = {
        borderTop: "2px solid #000",
        margin: "10px 0",
    };

    const sidebarBase: React.CSSProperties = {
        position: "absolute",
        top: 0,
        left: 0,
        height: "100%",
        zIndex: 10,
        fontFamily: nb.font,
        display: "flex",
        flexDirection: "column",
    };

    // Collapsed: full-height narrow strip flush to left edge
    if (!open) {
        return (
            <div
                style={{
                    ...sidebarBase,
                    width: 36,
                    backgroundColor: nb.bg,
                    borderRight: nb.borderRight,
                    cursor: "pointer",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    paddingTop: 12,
                    gap: 8,
                }}
                onClick={() => setOpen(true)}
                title="Open game info"
            >
                <span style={{ fontSize: "14px", fontWeight: 900 }}>▶</span>
            </div>
        );
    }

    return (
        <div
            style={{
                ...sidebarBase,
                width: 220,
                backgroundColor: nb.cardBg,
                borderRight: nb.borderRight,
            }}
        >
            {/* Header */}
            <div
                style={{
                    backgroundColor: nb.bg,
                    borderBottom: nb.border,
                    padding: "10px 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexShrink: 0,
                }}
            >
                <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.05em" }}>
                    🍬 CANDY FIGHT
                </span>
                <button
                    onClick={() => setOpen(false)}
                    style={{
                        border: nb.border,
                        backgroundColor: "#fff",
                        boxShadow: "2px 2px 0 #000",
                        width: 22,
                        height: 22,
                        cursor: "pointer",
                        fontWeight: 900,
                        fontSize: "11px",
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

            {/* Scrollable body */}
            <div style={{ padding: "10px 12px", flex: 1, overflowY: "auto" }}>

                {/* Match name */}
                <div style={label}>Match</div>
                <div style={{ fontSize: "10px", fontWeight: 700, marginBottom: 8, wordBreak: "break-word" }}>
                    {matchData?.setupData?.name ?? "Loading…"}
                </div>

                {/* Player */}
                <div style={label}>You</div>
                <div style={{ fontSize: "10px", fontWeight: 700, marginBottom: 8 }}>
                    {playerState.name}
                    <span style={{ fontSize: "9px", color: "#888", marginLeft: 4 }}>
                        #{playerState.playerID}
                    </span>
                </div>

                <div style={divider} />

                {/* Phase */}
                <div style={label}>Phase</div>
                <div
                    style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        marginBottom: 8,
                        padding: "3px 7px",
                        backgroundColor: nb.accent,
                        border: nb.border,
                        display: "inline-block",
                    }}
                >
                    {formatPhase(ctx.phase)}
                </div>

                <div style={divider} />

                {/* Turn order */}
                <div style={{ ...label, marginBottom: 6 }}>Turn Order</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {playersPublicInfo.map((p, index) => {
                        const isCurrent = ctx.currentPlayer === p.id;
                        const name = matchData?.players?.[index]?.name ?? `Player ${index + 1}`;

                        return (
                            <div
                                key={p.id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "3px 6px",
                                    border: isCurrent ? nb.border : "2px solid transparent",
                                    backgroundColor: isCurrent ? nb.accent : "transparent",
                                    fontSize: "10px",
                                    fontWeight: isCurrent ? 900 : 600,
                                }}
                            >
                                <span
                                    style={{
                                        width: 8,
                                        height: 8,
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
                                    <span style={{ fontSize: "8px", fontWeight: 700, color: "#555" }}>REVEALED</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Leave button — pinned to bottom */}
            <div style={{ padding: "10px 12px", borderTop: nb.border, flexShrink: 0 }}>
                <LeaveButton onClick={onLeaveMatch} />
            </div>
        </div>
    );
};

const playerColors = ["#ef4444", "#22c55e", "#a855f7", "#eab308"];
function playerDotColor(id: string): string {
    return playerColors[parseInt(id)] ?? "#888";
}

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
                padding: "7px 0",
                fontSize: "10px",
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
