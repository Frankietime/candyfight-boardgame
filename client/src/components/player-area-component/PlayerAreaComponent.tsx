import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card, GameState, PlayerGameState, PlayerViewModel, isFullPlayerState } from "@candyfight/shared/types"
import { WorkerComponent } from "../icon-components/WorkerComponent"
import { CardComponent } from "../card-components/CardComponent";
import { CardMini } from "../card-components/CardMini";
import { CharacterEnum } from "@candyfight/shared/enums";
import { anchors } from "@candyfight/shared/tutorial/types";
import { useT } from "../../i18n/useT";
import chilldudes from "../../assets/characters/character-chilldudes.png";
import kawaiisis from "../../assets/characters/character-kawaiisis.png";
import streetwizards from "../../assets/characters/character-streetwizards.png";
import techbros from "../../assets/characters/character-techbros.png";

const characterImageMap: Record<CharacterEnum, string> = {
    [CharacterEnum.ChillDudes]: chilldudes,
    [CharacterEnum.Kawaiisis]: kawaiisis,
    [CharacterEnum.StreetWizards]: streetwizards,
    [CharacterEnum.TechBros]: techbros,
};

// Portrait slot coordinates — all 4 same size, symmetric on left/right sides
// Left column center ≈ x=167 (0..335), Right column center ≈ x=1120 (960..1280)
// Top row ≈ y=37..250, Bottom row ≈ y=255..520
const P_W = 190;
const P_H = 200;
const P_LEFT_X  = Math.round((335 - P_W) / 2);          // 72
const P_RIGHT_X = Math.round(960 + (320 - P_W) / 2);    // 1025
const P_TOP_Y   = 37;
const P_BOT_Y   = 280;

const PORTRAIT_CURRENT = { left: 52, top: P_BOT_Y, width: P_W, height: P_H };
// Enemy seating order: 2P → top-right; 3P → adds bottom-right; 4P → adds top-left
const PORTRAIT_ENEMIES = [
    { left: P_RIGHT_X, top: P_TOP_Y, width: P_W, height: P_H }, // slot 0: top-right
    { left: P_RIGHT_X, top: P_BOT_Y, width: P_W, height: P_H }, // slot 1: bottom-right
    { left: P_LEFT_X,  top: P_TOP_Y, width: P_W, height: P_H }, // slot 2: top-left
];

// Stats panel positions: right-column portraits → stats to the LEFT; left-column → stats to the RIGHT.
const STATS_W = 35; // matches .player-resource-container width in CSS
const STATS_V_OFFSET = 30;
const ENEMY_STATS_POSITIONS = [
    { left: P_RIGHT_X - STATS_W - 20, top: P_TOP_Y + STATS_V_OFFSET }, // slot 0: top-right
    { left: P_RIGHT_X - STATS_W - 20, top: P_BOT_Y - 20 }, // slot 1: bottom-right
    { left: P_LEFT_X  + P_W     - 7, top: P_TOP_Y + STATS_V_OFFSET }, // slot 2: top-left
];

/**
 * Pile label that calls parent callbacks on hover — renders no overlay itself.
 */
interface PilePopoverProps {
    cards: Card[];
    label: string;
    count: number;
    onHover: (cards: Card[], title: string) => void;
    onLeave: () => void;
    /** Show cards in random order instead of alphabetically (use for deck) */
    shuffle?: boolean;
    /** Tutorial signal anchor id for the pile counter. */
    anchorId?: string;
}

const PilePopover = memo(({ cards, label, count, onHover, onLeave, shuffle = false, anchorId }: PilePopoverProps) => {
    const [flashing, setFlashing] = useState(false);
    const prevCount = useRef(count);

    useEffect(() => {
        if (prevCount.current !== count) {
            prevCount.current = count;
            setFlashing(true);
        }
    }, [count]);

    const handleEnter = () => {
        if (cards.length === 0) return;
        const display = shuffle
            ? [...cards].sort(() => Math.random() - 0.5)
            : [...cards].sort((a, b) => a.name.localeCompare(b.name));
        onHover(display, label);
    };

    return (
        <div
            {...(anchorId ? { "data-tutor-id": anchorId } : {})}
            style={{ position: 'relative' }}
            className={flashing ? 'stat-glow' : undefined}
            onAnimationEnd={() => setFlashing(false)}
            onMouseEnter={handleEnter}
            onMouseLeave={onLeave}
        >
            <div>{label}<hr /><div>{count}</div></div>
        </div>
    );
});

PilePopover.displayName = "PilePopover";

const FlashOnChange = ({ value, className, children, anchorId }: { value: number; className?: string; children: React.ReactNode; anchorId?: string }) => {
    const [flashing, setFlashing] = useState(false);
    const prevRef = useRef(value);
    useEffect(() => {
        if (prevRef.current !== value) {
            prevRef.current = value;
            setFlashing(true);
        }
    }, [value]);
    return (
        <div
            {...(anchorId ? { "data-tutor-id": anchorId } : {})}
            className={`${className ?? ''}${flashing ? ' stat-glow' : ''}`}
            onAnimationEnd={() => setFlashing(false)}
        >
            {children}
        </div>
    );
};

/**
 * Hand card that calls parent callbacks on hover — renders no overlay itself.
 */
interface HandCardWrapperProps {
    card: Card;
    index: number;
    isDisabled: boolean;
    isSelected: boolean;
    isNew: boolean;
    onClick: () => void;
    onHover: (card: Card) => void;
    onLeave: () => void;
}

const HandCardWrapper = memo(({ card, index, isDisabled, isSelected, isNew, onClick, onHover, onLeave }: HandCardWrapperProps) => (
    <div
        data-tutor-id={anchors.handCard(card.id)}
        className={isNew ? "card-drawn-flash" : undefined}
        style={{ position: 'absolute', top: 540, left: 390 + index * 105, width: 105, height: 157 }}
        onMouseEnter={() => onHover(card)}
        onMouseLeave={onLeave}
    >
        <CardComponent
            isDisabled={isDisabled}
            isSelected={isSelected}
            x={0} y={0} show={true}
            onClick={onClick}
            card={card}
        />
    </div>
));

HandCardWrapper.displayName = "HandCardWrapper";

export type PlayerAreaComponentProps = {
    G: GameState;
    player: PlayerGameState;
    moves: any;
    selectedCard?: Card;
    playerView: PlayerViewModel[];
    playerNames: string[];
    currentPlayerId: string;
    /**
     * Tutorial hook: when set, force-open the detail modal for this player id so a
     * tutorial step can glow elements inside it (e.g. the Signet ability). Clearing
     * it closes the forced modal. Normal play leaves this undefined.
     */
    autoOpenPlayerModalId?: string;
}

export const PlayerAreaComponent = memo(({
    G,
    player,
    moves,
    selectedCard,
    playerView,
    playerNames,
    currentPlayerId,
    autoOpenPlayerModalId,
}: PlayerAreaComponentProps) => {
    const onSelectCard = useCallback((card: Card) => moves.selectCard(card), [moves]);
    const onPass = useCallback(() => moves.pass(), [moves]);
    const onReveal = useCallback(() => moves.reveal(), [moves]);

    const enemies = useMemo(() =>
        playerView.filter(p => p.id !== player.id),
        [playerView, player.id]
    );

    // Board-level overlay state — one at a time, rendered at board center
    const [pileOverlay, setPileOverlay] = useState<{ cards: Card[], title: string } | null>(null);
    const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
    const [playerModal, setPlayerModal] = useState<{ data: PlayerGameState | PlayerViewModel; name: string; isOwn: boolean } | null>(null);
    const [hoveredPortraitId, setHoveredPortraitId] = useState<string | null>(null);
    const closeModal = useCallback(() => setPlayerModal(null), []);

    // Tutorial: open/close the detail modal only when the requested id *changes*,
    // so normal play (where this stays undefined) never has its modal disturbed.
    const prevAutoOpenId = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (autoOpenPlayerModalId === prevAutoOpenId.current) return;
        prevAutoOpenId.current = autoOpenPlayerModalId;

        if (autoOpenPlayerModalId === undefined) {
            setPlayerModal(null);
            return;
        }
        const isOwn = autoOpenPlayerModalId === player.id;
        const data = isOwn ? player : playerView.find(p => p.id === autoOpenPlayerModalId);
        if (!data) return;
        const name = playerNames[parseInt(autoOpenPlayerModalId)] ?? `Player ${parseInt(autoOpenPlayerModalId) + 1}`;
        setPlayerModal({ data, name, isOwn });
    }, [autoOpenPlayerModalId, player, playerView, playerNames]);

    const onPileHover = useCallback((cards: Card[], title: string) => {
        setPileOverlay({ cards, title });
    }, []);
    const onPileLeave = useCallback(() => setPileOverlay(null), []);

    const onCardHover = useCallback((card: Card) => setHoveredCard(card), []);
    const onCardLeave = useCallback(() => setHoveredCard(null), []);

    // Flash cards that just entered the hand (drawn / dealt).
    const prevHandIds = useRef<Set<string>>(new Set());
    const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set());
    useEffect(() => {
        const currentIds = (player.hand ?? []).map(c => c.id);
        const added = currentIds.filter(id => !prevHandIds.current.has(id));
        prevHandIds.current = new Set(currentIds);
        if (added.length === 0) return;
        setNewCardIds(new Set(added));
        const timer = setTimeout(() => setNewCardIds(new Set()), 900);
        return () => clearTimeout(timer);
    }, [player.hand]);

    return (<>
        {/* Character portraits — rendered first so they sit behind all other board elements */}
        <div
            data-tutor-id={anchors.characterInfo(player.id)}
            className={`current-player-portrait-frame${currentPlayerId === 'all' || player.id === currentPlayerId ? " proto-glow" : ""}`}
            style={{
                position: "absolute",
                left: PORTRAIT_CURRENT.left,
                top: PORTRAIT_CURRENT.top,
                width: PORTRAIT_CURRENT.width,
                height: PORTRAIT_CURRENT.height,
                zIndex: 1,
                cursor: "pointer",
            }}
            onClick={() => setPlayerModal({ data: player, name: playerNames[parseInt(player.id)] ?? `Player ${parseInt(player.id) + 1}`, isOwn: true })}
            onMouseEnter={() => setHoveredPortraitId(player.id)}
            onMouseLeave={() => setHoveredPortraitId(null)}
        >
            <div className="portrait-clip">
                {player.characterId && characterImageMap[player.characterId] && (
                    <img src={characterImageMap[player.characterId]} alt="your character" />
                )}
            </div>
            {hoveredPortraitId === player.id && <PortraitInfoIcon />}
        </div>
        {enemies.map((enemy, seatIndex) => {
            const slot = PORTRAIT_ENEMIES[seatIndex];
            if (!slot) return null;
            return (
                <div
                    key={`portrait-enemy-${enemy.id}`}
                    className={`current-player-portrait-frame${currentPlayerId === 'all' || enemy.id === currentPlayerId ? " proto-glow" : ""}`}
                    style={{
                        position: "absolute",
                        left: slot.left,
                        top: slot.top,
                        width: slot.width,
                        height: slot.height,
                        zIndex: 1,
                        cursor: "pointer",
                    }}
                    onClick={() => setPlayerModal({ data: enemy, name: playerNames[parseInt(enemy.id)] ?? `Player ${parseInt(enemy.id) + 1}`, isOwn: false })}
                    onMouseEnter={() => setHoveredPortraitId(enemy.id)}
                    onMouseLeave={() => setHoveredPortraitId(null)}
                >
                    <div className="portrait-clip">
                        {enemy.characterId && characterImageMap[enemy.characterId] && (
                            <img src={characterImageMap[enemy.characterId]} alt="enemy character" />
                        )}
                    </div>
                    {hoveredPortraitId === enemy.id && <PortraitInfoIcon />}
                </div>
            );
        })}

        <WorkerComponent
            numerOfWorkers={player.currentNumberOfWorkers}
            x={281} y={463}
            mirror={0}
            playerID={parseInt(player.id!)}
            tutorAnchorId={anchors.workerPool(player.id)}
        />

        {/* Current Player Resources */}
        <div className="player-resource-container absolute">
            <FlashOnChange value={player.victoryPoints} className="victory-points" anchorId={anchors.vp(player.id)}>{player.victoryPoints}</FlashOnChange>
            <FlashOnChange value={player.candy} anchorId={anchors.resource(player.id, "candy")}>Candy<hr /><div>{player.candy}</div></FlashOnChange>
            <FlashOnChange value={player.loot} anchorId={anchors.resource(player.id, "loot")}>Loot<hr /><div>{player.loot}</div></FlashOnChange>
            <PilePopover cards={player.deck} label="Deck" count={player.deck.length} onHover={onPileHover} onLeave={onPileLeave} shuffle anchorId={anchors.pile(player.id, "deck")} />
            <PilePopover cards={player.discardPile} label="Discard" count={player.discardPile.length} onHover={onPileHover} onLeave={onPileLeave} anchorId={anchors.pile(player.id, "discard")} />
            <PilePopover cards={player.trashPile} label="Trash" count={player.trashPile.length} onHover={onPileHover} onLeave={onPileLeave} anchorId={anchors.pile(player.id, "trash")} />
        </div>

        {/* Enemy Player Resources */}
        {enemies.map((enemy, seatIndex) => {
            const pos = ENEMY_STATS_POSITIONS[seatIndex];
            if (!pos) return null;
            return (
                <EnemyResourceDisplay
                    key={`enemy-${enemy.id}`}
                    enemy={enemy}
                    pos={pos}
                    name={playerNames[parseInt(enemy.id)] ?? ""}
                    onPileHover={onPileHover}
                    onPileLeave={onPileLeave}
                />
            );
        })}

        {/* Player Hand */}
        <div className="hand-container" style={{
            width: "200px", position: "relative", top: "-14px"
        }}>
            {player.hand?.map((card: Card, index) => (
                <HandCardWrapper
                    key={`card-${card?.id}-${index}`}
                    card={card}
                    index={index}
                    isDisabled={player.currentNumberOfWorkers == 0}
                    isSelected={card?.id == selectedCard?.id}
                    isNew={newCardIds.has(card?.id)}
                    onClick={() => onSelectCard(card)}
                    onHover={onCardHover}
                    onLeave={onCardLeave}
                />
            ))}
        </div>

        {/* Action Buttons */}
        <div
            data-tutor-id={anchors.passButton()}
            className={`pass-btn${!player.hasPlayedCard ? " disabled" : ""}${player.hasPlayedCard && player.currentNumberOfWorkers === 0 ? " should-glow" : ""}`}
            onClick={player.hasPlayedCard ? onPass : undefined}
        />
        <div
            data-tutor-id={anchors.revealButton()}
            className={`reveal-btn${player.currentNumberOfWorkers === 0 ? " should-glow" : ""}`}
            onClick={onReveal}
        />

        {/* Board-level: pile overlay (centered, styled like market modal) */}
        {pileOverlay && (
            <div className="pile-modal">
                <div className="pile-modal-title">{pileOverlay.title}</div>
                <div className="pile-modal-subtitle">
                    {pileOverlay.cards.length} card{pileOverlay.cards.length !== 1 ? 's' : ''}
                </div>
                <div className="pile-modal-cards">
                    {pileOverlay.cards.map((card, i) => (
                        <div key={`pile-card-${card.id}-${i}`} data-tutor-id={anchors.pileCard(card.id)} className="pile-card-slot">
                            <CardComponent card={card} x={0} y={0} w={90} h={157} show={true} />
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Board-level: hand card preview (centered, same card proportion at 2×) */}
        {hoveredCard && (
            <div className="hand-preview-centered">
                <CardComponent card={hoveredCard} x={0} y={0} w={210} h={314} show={true} />
            </div>
        )}

        {/* Player detail modal — rendered in document.body to escape board transform */}
        {playerModal && createPortal(
            <PlayerDetailModal
                data={playerModal.data}
                name={playerModal.name}
                isOwn={playerModal.isOwn}
                characterImageMap={characterImageMap}
                onClose={closeModal}
            />,
            document.body
        )}
    </>);
});

PlayerAreaComponent.displayName = "PlayerAreaComponent";

/**
 * Memoized enemy resource display component
 */
interface EnemyResourceDisplayProps {
    enemy: PlayerViewModel;
    pos: { left: number; top: number };
    name: string;
    onPileHover: (cards: Card[], title: string) => void;
    onPileLeave: () => void;
}

const EnemyResourceDisplay = memo(({ enemy, pos, name, onPileHover, onPileLeave }: EnemyResourceDisplayProps) => (
    <div
        className="player-resource-container absolute"
        style={{ top: pos.top, left: pos.left, fontSize: "7px" }}
    >
        <div className={`bg-player-${enemy.id}`} style={{ height: "3px", width: "100%", marginBottom: "2px" }} />
        <div style={{ fontSize: "6px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{name}</div>
        <div className="enemy victory-points">{enemy.victoryPoints}</div>
        <div>Candy<hr /><div>{enemy.candy}</div></div>
        <div>Loot<hr /><div>{enemy.loot}</div></div>
        <div>Deck<hr /><div>{enemy.deckLength}</div></div>
        <PilePopover cards={enemy.discardPile} label="Discard" count={enemy.discardPile.length} onHover={onPileHover} onLeave={onPileLeave} />
        <PilePopover cards={enemy.trashPile} label="Trash" count={enemy.trashPile.length} onHover={onPileHover} onLeave={onPileLeave} />
    </div>
));

EnemyResourceDisplay.displayName = "EnemyResourceDisplay";

// ─── Portrait Info Icon ───────────────────────────────────────────────────────

const PortraitInfoIcon = () => (
    <div
        className="portrait-info-icon"
        style={{
            position: "absolute",
            top: -8,
            right: -8,
            width: 22,
            height: 22,
            borderRadius: "50%",
            backgroundColor: "#fef08a",
            border: "2px solid #000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 900,
            color: "#000",
            zIndex: 3,
            pointerEvents: "none",
            fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
            userSelect: "none",
        }}
    >
        ℹ
    </div>
);

// ─── Player Detail Modal ──────────────────────────────────────────────────────

const nb = {
    bg: '#e0d4fc',
    border: '2px solid #000',
    accent: '#fef08a',
    font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
};

interface PlayerDetailModalProps {
    data: PlayerGameState | PlayerViewModel;
    name: string;
    isOwn: boolean;
    characterImageMap: Record<CharacterEnum, string>;
    onClose: () => void;
}

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.07em", color: "#777" }}>{label}</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: "#111" }}>{value}</span>
    </div>
);

const PileSection = ({ title, cards }: { title: string; cards: Card[] }) => (
    <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", marginBottom: 10 }}>
            {title} <span style={{ color: "#aaa", fontWeight: 400 }}>({cards.length})</span>
        </div>
        {cards.length === 0 ? (
            <div style={{ fontSize: 11, color: "#bbb", fontStyle: "italic" }}>Empty</div>
        ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {cards.map((card, i) => (
                    <CardMini key={`${card.id}-${i}`} card={card} />
                ))}
            </div>
        )}
    </div>
);

const PlayerDetailModal = ({ data, name, isOwn, characterImageMap, onClose }: PlayerDetailModalProps) => {
    const t = useT();
    const isFull = isFullPlayerState(data);
    const characterImg = data.characterId ? characterImageMap[data.characterId] : null;

    const deckCards: Card[] = isFull ? [...data.deck].sort((a, b) => a.name.localeCompare(b.name)) : [];
    const discardCards: Card[] = [...data.discardPile].sort((a, b) => a.name.localeCompare(b.name));
    const trashCards: Card[] = [...data.trashPile].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    zIndex: 200,
                }}
            />

            {/* Panel */}
            <div
                style={{
                    position: "fixed",
                    top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "min(680px, 92vw)",
                    maxHeight: "88vh",
                    overflowY: "auto",
                    backgroundColor: "#fff",
                    border: nb.border,
                    boxShadow: "8px 8px 0 #000",
                    fontFamily: nb.font,
                    zIndex: 201,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        backgroundColor: nb.bg,
                        borderBottom: nb.border,
                        padding: "14px 18px",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        flexShrink: 0,
                    }}
                >
                    {characterImg && (
                        <img
                            src={characterImg}
                            alt={name}
                            style={{ width: 52, height: 52, objectFit: "cover", objectPosition: "top", border: nb.border }}
                        />
                    )}
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.1 }}>{name}</div>
                        {data.characterId && (
                            <div style={{ fontSize: 11, color: "#555", marginTop: 3, fontWeight: 600 }}>
                                {t(`character.${data.characterId}.name`)}
                            </div>
                        )}
                        {isOwn && (
                            <div style={{ fontSize: 10, marginTop: 4, backgroundColor: nb.accent, border: "1px solid #000", display: "inline-block", padding: "1px 6px", fontWeight: 700 }}>
                                YOU
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            border: nb.border, backgroundColor: "#fff",
                            boxShadow: "3px 3px 0 #000", width: 32, height: 32,
                            cursor: "pointer", fontWeight: 900, fontSize: 16,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Stats row */}
                <div
                    style={{
                        display: "flex",
                        gap: 0,
                        borderBottom: nb.border,
                        flexShrink: 0,
                    }}
                >
                    {[
                        { label: "VP", value: data.victoryPoints },
                        { label: "Candy", value: data.candy },
                        { label: "Loot", value: data.loot },
                        { label: "Workers", value: `${data.currentNumberOfWorkers}` },
                        { label: "Hand", value: isFull ? data.hand.length : (data as PlayerViewModel).handLength },
                        { label: "Deck", value: isFull ? data.deck.length : (data as PlayerViewModel).deckLength },
                    ].map(({ label, value }, i, arr) => (
                        <div
                            key={label}
                            style={{
                                flex: 1,
                                padding: "12px 8px",
                                borderRight: i < arr.length - 1 ? "1px solid #ddd" : "none",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 4,
                            }}
                        >
                            <Stat label={label} value={value} />
                        </div>
                    ))}
                </div>

                {/* Signet ability — fired by playing the Signet card */}
                {data.characterId && (
                    <div
                        data-tutor-id={anchors.signetInfo(data.id)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 18px",
                            borderBottom: nb.border,
                            backgroundColor: "#faf5ff",
                            flexShrink: 0,
                        }}
                    >
                        <span
                            style={{
                                fontSize: 22,
                                lineHeight: 1,
                                filter: "drop-shadow(1px 1px 0 #000)",
                            }}
                            aria-hidden
                        >
                            💍
                        </span>
                        <div>
                            <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7c3aed" }}>
                                {t("characterModal.signetTitle")}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginTop: 2 }}>
                                {t(`character.${data.characterId}.signet`)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Piles */}
                <div style={{ padding: "16px 18px" }}>
                    {data.hasRevealed && (
                        <div style={{ marginBottom: 14, fontSize: 11, fontWeight: 700, color: "#555" }}>
                            Status: <span style={{ backgroundColor: nb.accent, border: "1px solid #000", padding: "1px 6px" }}>REVEALED</span>
                        </div>
                    )}

                    <PileSection title="Discard Pile" cards={discardCards} />
                    <PileSection title="Trash" cards={trashCards} />

                    {isOwn && (
                        <>
                            <div style={{ borderTop: nb.border, margin: "20px 0 0" }} />
                            <PileSection title="Deck (not in draw order)" cards={deckCards} />
                        </>
                    )}
                </div>
            </div>
        </>
    );
};
