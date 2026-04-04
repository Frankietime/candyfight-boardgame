import { memo, useCallback, useState } from "react";
import { LobbyAPI } from "boardgame.io";
import { CharacterEnum } from "@candyfight/shared/enums";
import { PlayerViewModel } from "@candyfight/shared/types";

import chilldudes from "../../assets/characters/character-chilldudes.png";
import kawaiisis from "../../assets/characters/character-kawaiisis.png";
import streetwizards from "../../assets/characters/character-streetwizards.png";
import techbros from "../../assets/characters/character-techbros.png";

// Neobrutalist design tokens
const nb = {
    bg: '#e0d4fc',
    cardBg: '#ffffff',
    border: '2px solid #000',
    shadowSm: '4px 4px 0px 0px #000',
    shadowMd: '6px 6px 0px 0px #000',
    accent: '#fef08a',
    font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
};

interface CharacterCard {
    id: CharacterEnum;
    name: string;
    description: string;
    signetAbility: string;
    image: string;
}

const CHARACTERS: CharacterCard[] = [
    {
        id: CharacterEnum.ChillDudes,
        name: "Chill Dudes",
        description: "They take it slow, but always come prepared.",
        signetAbility: "Draw 1 card + gain 1 loot",
        image: chilldudes,
    },
    {
        id: CharacterEnum.Kawaiisis,
        name: "Kawaiisis",
        description: "Don't let the cute exterior fool you.",
        signetAbility: "Gain 2 candy + 1 presence",
        image: kawaiisis,
    },
    {
        id: CharacterEnum.StreetWizards,
        name: "Street Wizards",
        description: "They make loot appear from thin air.",
        signetAbility: "Gain 3 loot",
        image: streetwizards,
    },
    {
        id: CharacterEnum.TechBros,
        name: "Tech Bros",
        description: "Always optimizing, always drawing.",
        signetAbility: "Draw 2 cards + gain 1 candy",
        image: techbros,
    },
];

interface CharacterSelectionScreenProps {
    playersViewModel: PlayerViewModel[];
    matchData: LobbyAPI.Match;
    playerID: string | null;
    moves: any;
}

export const CharacterSelectionScreen = memo(({
    playersViewModel,
    matchData,
    playerID,
    moves,
}: CharacterSelectionScreenProps) => {
    const myPlayer = playersViewModel.find(p => p.id === playerID);
    const myCharacterId = myPlayer?.characterId;

    const [pendingId, setPendingId] = useState<CharacterEnum | null>(null);

    const onSelect = useCallback((characterId: CharacterEnum) => {
        if (myCharacterId) return;
        setPendingId(prev => prev === characterId ? null : characterId);
    }, [myCharacterId]);

    const onConfirm = useCallback(() => {
        if (!pendingId || myCharacterId) return;
        moves.selectCharacter(pendingId);
        setPendingId(null);
    }, [pendingId, myCharacterId, moves]);

    const takenMap: Record<string, string> = {};
    playersViewModel.forEach(p => {
        if (p.characterId) {
            const name = matchData.players[parseInt(p.id)]?.name ?? `Player ${parseInt(p.id) + 1}`;
            takenMap[p.characterId] = name;
        }
    });

    const waitingPlayers = playersViewModel
        .filter(p => !p.characterId)
        .map(p => matchData.players[parseInt(p.id)]?.name ?? `Player ${parseInt(p.id) + 1}`);

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                backgroundColor: nb.bg,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 50,
                fontFamily: nb.font,
                padding: "40px 24px",
            }}
        >
            {/* Title */}
            <h1
                style={{
                    fontSize: "22px",
                    fontWeight: 900,
                    color: "#000",
                    letterSpacing: "-0.5px",
                    marginBottom: "8px",
                    fontFamily: "'Press Start 2P', cursive",
                    lineHeight: 1.4,
                    textAlign: "center",
                }}
            >
                Choose Your Character
            </h1>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#555", marginBottom: "36px", textAlign: "center" }}>
                Each character unlocks a unique Signet ability
            </p>

            {/* Character cards grid */}
            <div
                style={{
                    display: "flex",
                    gap: "20px",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    maxWidth: "960px",
                }}
            >
                {CHARACTERS.map(char => {
                    const takenBy = takenMap[char.id];
                    const isTakenByMe = myCharacterId === char.id;
                    const isTakenByOther = !!takenBy && !isTakenByMe;
                    const isAvailable = !takenBy && !myCharacterId;
                    const isPending = pendingId === char.id;

                    return (
                        <CharacterCardItem
                            key={char.id}
                            char={char}
                            isTakenByMe={isTakenByMe}
                            isTakenByOther={isTakenByOther}
                            isAvailable={isAvailable}
                            isPending={isPending}
                            takenByName={takenBy}
                            onSelect={onSelect}
                        />
                    );
                })}
            </div>

            {/* Confirm button */}
            {!myCharacterId && (
                <ConfirmButton
                    pendingId={pendingId}
                    onConfirm={onConfirm}
                />
            )}

            {/* Waiting footer */}
            <div
                style={{
                    marginTop: "32px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#555",
                    letterSpacing: "0.05em",
                    textAlign: "center",
                    border: nb.border,
                    boxShadow: nb.shadowSm,
                    padding: "8px 20px",
                    backgroundColor: "#fff",
                }}
            >
                {waitingPlayers.length > 0
                    ? `Waiting for: ${waitingPlayers.join(", ")} …`
                    : "All players ready — starting game…"
                }
            </div>
        </div>
    );
});

CharacterSelectionScreen.displayName = "CharacterSelectionScreen";

const ConfirmButton = memo(({ pendingId, onConfirm }: { pendingId: CharacterEnum | null; onConfirm: () => void }) => {
    const [pressed, setPressed] = useState(false);
    const ready = !!pendingId;

    return (
        <button
            onClick={ready ? onConfirm : undefined}
            onMouseDown={() => { if (ready) setPressed(true); }}
            onMouseUp={() => setPressed(false)}
            onMouseLeave={() => setPressed(false)}
            disabled={!ready}
            style={{
                marginTop: "28px",
                border: nb.border,
                boxShadow: pressed ? "none" : nb.shadowMd,
                padding: "12px 40px",
                fontSize: "13px",
                fontFamily: nb.font,
                fontWeight: 900,
                cursor: ready ? "pointer" : "not-allowed",
                backgroundColor: ready ? "#000" : "#ccc",
                color: ready ? "#fff" : "#888",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                transform: pressed ? "translate(4px, 4px)" : undefined,
                transition: "background-color 0.15s",
            }}
        >
            {ready
                ? `Confirm — ${CHARACTERS.find(c => c.id === pendingId)?.name}`
                : "Select a character"}
        </button>
    );
});

ConfirmButton.displayName = "ConfirmButton";

interface CharacterCardItemProps {
    char: CharacterCard;
    isTakenByMe: boolean;
    isTakenByOther: boolean;
    isAvailable: boolean;
    isPending: boolean;
    takenByName?: string;
    onSelect: (id: CharacterEnum) => void;
}

const CharacterCardItem = memo(({
    char,
    isTakenByMe,
    isTakenByOther,
    isAvailable,
    isPending,
    takenByName,
    onSelect,
}: CharacterCardItemProps) => {
    const [pressed, setPressed] = useState(false);

    const bgColor = isTakenByMe ? nb.accent : nb.cardBg;
    const opacity = isTakenByOther ? 0.45 : 1;
    const cursor = isAvailable ? "pointer" : isTakenByMe ? "default" : "not-allowed";

    const transform = pressed && isAvailable ? "translate(4px, 4px)" : undefined;
    const boxShadow = pressed && isAvailable
        ? "none"
        : isPending
        ? `0 0 0 4px #000, ${nb.shadowMd}`
        : nb.shadowMd;

    return (
        <div
            onClick={isAvailable ? () => onSelect(char.id) : undefined}
            onMouseDown={() => { if (isAvailable) setPressed(true); }}
            onMouseUp={() => setPressed(false)}
            onMouseLeave={() => setPressed(false)}
            style={{
                width: "200px",
                backgroundColor: bgColor,
                border: nb.border,
                boxShadow,
                transform,
                opacity,
                cursor,
                position: "relative",
                userSelect: "none",
                transition: "opacity 0.15s",
            }}
        >
            {/* Portrait */}
            <img
                src={char.image}
                alt={char.name}
                style={{ width: "100%", display: "block" }}
            />

            {/* Taken by other overlay */}
            {isTakenByOther && (
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255,255,255,0.65)",
                        flexDirection: "column",
                        gap: "6px",
                    }}
                >
                    <span style={{ fontSize: "20px" }}>🔒</span>
                    <span style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        border: nb.border,
                        backgroundColor: "#fff",
                        padding: "3px 8px",
                        boxShadow: nb.shadowSm,
                    }}>
                        {takenByName}
                    </span>
                </div>
            )}

            {/* Selected checkmark badge */}
            {isTakenByMe && (
                <div
                    style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        width: "24px",
                        height: "24px",
                        backgroundColor: "#000",
                        border: nb.border,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "13px",
                        color: "#fff",
                        fontWeight: 900,
                    }}
                >
                    ✓
                </div>
            )}

            {/* Name + ability footer */}
            <div
                style={{
                    padding: "10px 10px 8px",
                    borderTop: nb.border,
                    backgroundColor: isTakenByMe ? nb.accent : isPending ? "#f0e8ff" : "#fff",
                }}
            >
                <div style={{ fontSize: "11px", fontWeight: 900, marginBottom: "4px", letterSpacing: "-0.2px" }}>
                    {char.name}
                </div>
                <div style={{ fontSize: "10px", color: "#555", marginBottom: "6px", lineHeight: 1.4 }}>
                    {char.description}
                </div>
                <div
                    style={{
                        fontSize: "9px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        border: nb.border,
                        padding: "3px 6px",
                        backgroundColor: "#000",
                        color: "#fff",
                        display: "inline-block",
                    }}
                >
                    Signet: {char.signetAbility}
                </div>
            </div>
        </div>
    );
});

CharacterCardItem.displayName = "CharacterCardItem";
