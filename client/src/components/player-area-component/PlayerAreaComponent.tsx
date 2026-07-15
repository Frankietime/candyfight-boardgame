import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card, GameState, PlayerGameState, PlayerViewModel, isFullPlayerState } from "@candyfight/shared/types"
import { WorkerComponent } from "../icon-components/WorkerComponent"
import { workerIconsByPlayerId, resourceIconsDict } from "../icon-components/constants";
import { LocationActionsEnum } from "@candyfight/shared/enums";
import { locsXPos, locsYPos } from "../board-component/constants";
import { playerSeatColor, seatRing } from "@candyfight/shared/constants";
import { calculateCombatWinner } from "@candyfight/shared/game-helper";
import { DistrictIcon } from "../ui/GameIcon";
import { CardComponent } from "../card-components/CardComponent";
import { CardMini } from "../card-components/CardMini";
import { CharacterEnum } from "@candyfight/shared/enums";
import { anchors } from "@candyfight/shared/tutorial/types";
import { revealEffectOf } from "@candyfight/shared/mods/revealEffects";
import { isPuzzleSolved } from "@candyfight/shared/services/puzzleService";
import { eligibleFightDistricts, RevealMoveParams } from "@candyfight/shared/services/moves/phaseService";
import { PuzzleRequirement } from "../card-components/PuzzleRequirement";
import { claimFlashSlot } from "../ui/flashQueue";
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

const PORTRAIT_CURRENT_LEFT = 52;
const PORTRAIT_CURRENT = { left: PORTRAIT_CURRENT_LEFT, top: P_BOT_Y, width: P_W, height: P_H };
// Enemy slots follow the turn ring from the viewer's seat (bottom-left):
// whoever plays right after me sits bottom-right, then top-right, then
// top-left — the turn glow orbits bottom-left → bottom-right → top-right →
// top-left on EVERY viewer's screen.
// Exception: with a single enemy (2P) they sit top-right, face to face.
const PORTRAIT_ENEMIES = [
    { left: P_RIGHT_X, top: P_BOT_Y, width: P_W, height: P_H }, // slot 0: bottom-right
    { left: P_RIGHT_X, top: P_TOP_Y, width: P_W, height: P_H }, // slot 1: top-right
    // slot 2 (top-left): aligned with the current player's portrait so it
    // clears its own deck/discard/trash panel on the right
    { left: PORTRAIT_CURRENT_LEFT, top: P_TOP_Y, width: P_W, height: P_H },
];

// Stats panel positions: right-column portraits → stats to the LEFT; left-column → stats to the RIGHT.
// Top slots sit beside the lower half of the portrait, clear of the turquoise
// backdrop plate (which bleeds BACKDROP_BLEED px past the frame on every side).
const STATS_W = 60; // matches .player-resource-container width in CSS
const STATS_BELOW_Y = P_TOP_Y + 80; // beside the lower half of the top portraits, clear of the plate's top ornaments
const ENEMY_STATS_POSITIONS = [
    // slot 0 (bottom-right): aligned with the current player's panel
    { left: P_RIGHT_X - STATS_W - 5, top: 310 },
    { left: P_RIGHT_X - STATS_W - 5, top: STATS_BELOW_Y }, // slot 1: top-right
    // slot 2 (top-left): just right of the plate edge, slightly below mid-portrait
    { left: 247, top: STATS_BELOW_Y + 5 },
];

/** Card-counter icon (draw/discard/trash action art). */
const PileIcon = ({ actionId, title }: { actionId: LocationActionsEnum; title: string }) => (
    <img
        src={resourceIconsDict[actionId]}
        alt={title}
        title={title}
        style={{ height: 24, width: "auto", display: "inline-block" }}
    />
);

/** Deck counter icon: the draw-card action art. */
const DeckIcon = () => <PileIcon actionId={LocationActionsEnum.DRAW} title="Deck" />;

/** Hand counter icon. */
const HandIcon = () => (
    <span title="Hand" style={{ fontSize: 20, lineHeight: 1 }} aria-label="Hand">✋</span>
);

/** One counter row: icon (or text) and number side by side. */
const CounterRow = ({ label, count }: { label: React.ReactNode; count: number }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, height: 26 }}>
        {label}
        {/* margin/lineHeight reset: legacy `div div` CSS pushes the number off-center */}
        <div style={{ margin: 0, lineHeight: 1 }}>{count}</div>
    </div>
);

/**
 * Pile label that calls parent callbacks on hover — renders no overlay itself.
 */
interface PilePopoverProps {
    cards: Card[];
    /** What the counter shows (text or an icon). */
    label: React.ReactNode;
    /** Pile name for the centered overlay title and the tooltip. */
    title: string;
    count: number;
    onHover: (cards: Card[], title: string) => void;
    onLeave: () => void;
    /** Show cards in random order instead of alphabetically (use for deck) */
    shuffle?: boolean;
    /** Tutorial signal anchor id for the pile counter. */
    anchorId?: string;
}

const PilePopover = memo(({ cards, label, title, count, onHover, onLeave, shuffle = false, anchorId }: PilePopoverProps) => {
    const [flashing, setFlashing] = useState(false);
    const prevCount = useRef(count);

    // Flashes are staggered through the global queue — sequential, never parallel.
    useEffect(() => {
        if (prevCount.current !== count) {
            prevCount.current = count;
            const delay = claimFlashSlot();
            if (delay <= 0) {
                setFlashing(true);
                return;
            }
            const timer = setTimeout(() => setFlashing(true), delay);
            return () => clearTimeout(timer);
        }
    }, [count]);

    const handleEnter = () => {
        if (cards.length === 0) return;
        const display = shuffle
            ? [...cards].sort(() => Math.random() - 0.5)
            : [...cards].sort((a, b) => a.name.localeCompare(b.name));
        onHover(display, title);
    };

    return (
        <div
            {...(anchorId ? { "data-tutor-id": anchorId } : {})}
            style={{ position: 'relative' }}
            className={flashing ? 'stat-glow' : undefined}
            title={title}
            onAnimationEnd={() => setFlashing(false)}
            onMouseEnter={handleEnter}
            onMouseLeave={onLeave}
        >
            <CounterRow label={label} count={count} />
        </div>
    );
});

PilePopover.displayName = "PilePopover";

const FlashOnChange = ({ value, className, children, anchorId }: { value: number; className?: string; children: React.ReactNode; anchorId?: string }) => {
    const [flashing, setFlashing] = useState(false);
    const prevRef = useRef(value);
    // Staggered via the global flash queue — sequential, never parallel.
    useEffect(() => {
        if (prevRef.current !== value) {
            prevRef.current = value;
            const delay = claimFlashSlot();
            if (delay <= 0) {
                setFlashing(true);
                return;
            }
            const timer = setTimeout(() => setFlashing(true), delay);
            return () => clearTimeout(timer);
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

    // Revealing with reveal-effect cards in hand opens the resolution modal.
    const [revealModalOpen, setRevealModalOpen] = useState(false);
    const onReveal = useCallback(() => {
        const hasRevealEffects = (player.hand ?? []).some(c => revealEffectOf(c) !== "none");
        if (hasRevealEffects) {
            setRevealModalOpen(true);
            return;
        }
        moves.reveal();
    }, [moves, player.hand]);
    const onRevealResolved = useCallback((revealParams: RevealMoveParams) => {
        moves.reveal(revealParams);
        setRevealModalOpen(false);
    }, [moves]);

    // Enemies in RING order starting after my seat, so slot 0 is whoever
    // plays right after me — the seating that makes turns orbit
    // counter-clockwise on this viewer's screen.
    const enemies = useMemo(() => {
        const ring = seatRing(G.config.numPlayers);
        const myIdx = ring.indexOf(player.id);
        const seatsAfterMe = myIdx >= 0
            ? [...ring.slice(myIdx + 1), ...ring.slice(0, myIdx)]
            : ring;
        return seatsAfterMe
            .map(seat => playerView.find(p => p.id === seat))
            .filter((p): p is PlayerViewModel => !!p && p.id !== player.id);
    }, [playerView, player.id, G.config.numPlayers]);

    // 2P: the lone enemy sits face-to-face (top-right) instead of beside me.
    const enemySlotIndex = useCallback(
        (i: number) => (enemies.length === 1 ? 1 : i),
        [enemies.length]
    );

    // Seat → portrait rect, for the placement lines (own seat + enemy slots).
    const seatRects = useMemo(() => {
        const rects: Record<string, { left: number; top: number; width: number; height: number }> = {
            [player.id]: PORTRAIT_CURRENT,
        };
        enemies.forEach((enemy, i) => {
            const slot = PORTRAIT_ENEMIES[enemySlotIndex(i)];
            if (slot) rects[enemy.id] = slot;
        });
        return rects;
    }, [player.id, enemies, enemySlotIndex]);

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

    // Turn-order position (1-based) per seat, following the seating ring
    // forward from the round's first player — the same walk the engine's
    // turn order does, so badge numbers always match the actual sequence.
    const turnPositionBySeat = useMemo(() => {
        const positions: Record<string, number> = {};
        if (G.firstPlayerID !== undefined) {
            const ring = seatRing(G.config.numPlayers);
            const fi = ring.indexOf(G.firstPlayerID);
            if (fi >= 0) ring.forEach((seat, i) => {
                positions[seat] = ((i - fi + ring.length) % ring.length) + 1;
            });
        }
        return positions;
    }, [G.firstPlayerID, G.config.numPlayers]);

    // Districts each seat currently dominates (strictly leading presence —
    // same rule combat uses). Drives the district chips on the portraits.
    const dominanceBySeat = useMemo(() => {
        const bySeat: Record<string, string[]> = {};
        G.districts.forEach(district => {
            const leader = calculateCombatWinner(district);
            if (leader) (bySeat[leader] ??= []).push(district.id);
        });
        return bySeat;
    }, [G.districts]);

    // Round start: exaggerated glow burst on the first player's character area.
    // firstPlayerID is stamped at round start and rotates each round.
    const [burstSeatId, setBurstSeatId] = useState<string | null>(null);
    const prevFirstPlayerRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (G.firstPlayerID === undefined || G.firstPlayerID === prevFirstPlayerRef.current) return;
        prevFirstPlayerRef.current = G.firstPlayerID;
        setBurstSeatId(G.firstPlayerID);
        const timer = setTimeout(() => setBurstSeatId(null), 3000);
        return () => clearTimeout(timer);
    }, [G.firstPlayerID]);

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
        {(currentPlayerId === 'all' || player.id === currentPlayerId) && <PortraitBackdrop rect={PORTRAIT_CURRENT} />}
        <div
            data-tutor-id={anchors.characterInfo(player.id)}
            className={`current-player-portrait-frame${currentPlayerId === 'all' || player.id === currentPlayerId ? " proto-glow" : ""}${burstSeatId === player.id ? " round-start-burst" : ""}`}
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
            <div className="portrait-clip" style={{ backgroundColor: playerSeatColor(player.id) }}>
                {player.characterId && characterImageMap[player.characterId] && (
                    <img
                        src={characterImageMap[player.characterId]}
                        alt="your character"
                        style={player.hasRevealed ? { filter: "grayscale(1) brightness(0.85)" } : undefined}
                    />
                )}
            </div>
            <PortraitNamePlate
                name={playerNames[parseInt(player.id)] ?? `Player ${parseInt(player.id) + 1}`}
                vp={player.victoryPoints}
                vpAnchorId={anchors.vp(player.id)}
            />
            <PortraitResourceStrip
                candy={player.candy}
                loot={player.loot}
                candyAnchorId={anchors.resource(player.id, "candy")}
                lootAnchorId={anchors.resource(player.id, "loot")}
            />
            {turnPositionBySeat[player.id] !== undefined && <TurnOrderBadge position={turnPositionBySeat[player.id]} />}
            <DominanceBadges districtIds={dominanceBySeat[player.id]} />
            {hoveredPortraitId === player.id && <PortraitInfoIcon />}
        </div>
        {/* Own workers live only in the play area tray (WorkerComponent below) */}
        <CardsInPlayRow cards={player.cardsInPlay ?? []} rect={PORTRAIT_CURRENT} onHover={onCardHover} onLeave={onCardLeave} />
        {enemies.map((enemy, i) => {
            const slot = PORTRAIT_ENEMIES[enemySlotIndex(i)];
            if (!slot) return null;
            return (<div key={`portrait-enemy-group-${enemy.id}`} style={{ display: "contents" }}>
                {(currentPlayerId === 'all' || enemy.id === currentPlayerId) && <PortraitBackdrop rect={slot} />}
                <div
                    key={`portrait-enemy-${enemy.id}`}
                    className={`current-player-portrait-frame${currentPlayerId === 'all' || enemy.id === currentPlayerId ? " proto-glow" : ""}${burstSeatId === enemy.id ? " round-start-burst" : ""}`}
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
                    <div className="portrait-clip" style={{ backgroundColor: playerSeatColor(enemy.id) }}>
                        {enemy.characterId && characterImageMap[enemy.characterId] && (
                            <img
                                src={characterImageMap[enemy.characterId]}
                                alt="enemy character"
                                style={enemy.hasRevealed ? { filter: "grayscale(1) brightness(0.85)" } : undefined}
                            />
                        )}
                    </div>
                    <PortraitNamePlate
                        name={playerNames[parseInt(enemy.id)] ?? `Player ${parseInt(enemy.id) + 1}`}
                        vp={enemy.victoryPoints}
                    />
                    <PortraitResourceStrip candy={enemy.candy} loot={enemy.loot} />
                    {turnPositionBySeat[enemy.id] !== undefined && <TurnOrderBadge position={turnPositionBySeat[enemy.id]} />}
                    <DominanceBadges districtIds={dominanceBySeat[enemy.id]} />
                    {hoveredPortraitId === enemy.id && <PortraitInfoIcon />}
                </div>
                <WorkersRow count={enemy.currentNumberOfWorkers} playerId={enemy.id} rect={slot} />
                <CardsInPlayRow cards={enemy.cardsInPlay} rect={slot} onHover={onCardHover} onLeave={onCardLeave} />
            </div>);
        })}

        {/* Animated dotted lines from each character to the locations they played */}
        <PlacementLinesOverlay districts={G.districts} seatRects={seatRects} currentPlayerId={currentPlayerId} />

        <WorkerComponent
            numerOfWorkers={player.currentNumberOfWorkers}
            x={281} y={463}
            mirror={0}
            playerID={parseInt(player.id!)}
            tutorAnchorId={anchors.workerPool(player.id)}
        />

        {/* Current Player Resources — candy/loot/VP live on the portrait overlays now */}
        <div className="player-resource-container absolute">
            <FlashOnChange value={player.hand?.length ?? 0}>
                <div title="Hand"><CounterRow label={<HandIcon />} count={player.hand?.length ?? 0} /></div>
            </FlashOnChange>
            <PilePopover cards={player.deck} label={<DeckIcon />} title="Deck" count={player.deck.length} onHover={onPileHover} onLeave={onPileLeave} shuffle anchorId={anchors.pile(player.id, "deck")} />
            <PilePopover cards={player.discardPile} label={<PileIcon actionId={LocationActionsEnum.DISCARD} title="Discard" />} title="Discard" count={player.discardPile.length} onHover={onPileHover} onLeave={onPileLeave} anchorId={anchors.pile(player.id, "discard")} />
            <PilePopover cards={player.trashPile} label={<PileIcon actionId={LocationActionsEnum.TRASH} title="Trash" />} title="Trash" count={player.trashPile.length} onHover={onPileHover} onLeave={onPileLeave} anchorId={anchors.pile(player.id, "trash")} />
        </div>

        {/* Enemy Player Resources */}
        {enemies.map((enemy, i) => {
            const pos = ENEMY_STATS_POSITIONS[enemySlotIndex(i)];
            if (!pos) return null;
            return (
                <EnemyResourceDisplay
                    key={`enemy-${enemy.id}`}
                    enemy={enemy}
                    pos={pos}
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

        {/* Action Buttons — glow only prompts on MY turn, never while enemies act */}
        <div
            data-tutor-id={anchors.passButton()}
            className={`pass-btn${!player.hasPlayedCard ? " disabled" : ""}${currentPlayerId === player.id && player.hasPlayedCard && player.currentNumberOfWorkers === 0 ? " should-glow" : ""}`}
            onClick={player.hasPlayedCard ? onPass : undefined}
        />
        <div
            data-tutor-id={anchors.revealButton()}
            className={`reveal-btn${player.hasPlayedCard ? " disabled" : ""}${currentPlayerId === player.id && !player.hasPlayedCard && player.currentNumberOfWorkers === 0 ? " should-glow" : ""}`}
            onClick={!player.hasPlayedCard ? onReveal : undefined}
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

        {/* Reveal resolution — fight target / puzzle solving / info rows */}
        {revealModalOpen && (
            <RevealResolutionModal
                G={G}
                player={player}
                onConfirm={onRevealResolved}
                onCancel={() => setRevealModalOpen(false)}
            />
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
    onPileHover: (cards: Card[], title: string) => void;
    onPileLeave: () => void;
}

const EnemyResourceDisplay = memo(({ enemy, pos, onPileHover, onPileLeave }: EnemyResourceDisplayProps) => (
    // Name/VP live on the portrait name plate and candy/loot on the resource
    // strip — this panel is just the piles, at the current player's size.
    <div
        className="player-resource-container absolute"
        style={{ top: pos.top, left: pos.left }}
    >
        <FlashOnChange value={enemy.handLength}>
            <div title="Hand"><CounterRow label={<HandIcon />} count={enemy.handLength} /></div>
        </FlashOnChange>
        <FlashOnChange value={enemy.deckLength}>
            <div title="Deck"><CounterRow label={<DeckIcon />} count={enemy.deckLength} /></div>
        </FlashOnChange>
        <PilePopover cards={enemy.discardPile} label={<PileIcon actionId={LocationActionsEnum.DISCARD} title="Discard" />} title="Discard" count={enemy.discardPile.length} onHover={onPileHover} onLeave={onPileLeave} />
        <PilePopover cards={enemy.trashPile} label={<PileIcon actionId={LocationActionsEnum.TRASH} title="Trash" />} title="Trash" count={enemy.trashPile.length} onHover={onPileHover} onLeave={onPileLeave} />
    </div>
));

EnemyResourceDisplay.displayName = "EnemyResourceDisplay";

// ─── Portrait Info Icon ───────────────────────────────────────────────────────

/**
 * Animated dotted line from a character portrait to the location they just
 * played, in the player's seat color. Each line shows when the claim happens
 * and lasts only while it is still that player's turn — the moment the turn
 * passes to someone else, their lines are erased.
 */
const PlacementLinesOverlay = ({ districts, seatRects, currentPlayerId }: {
    districts: GameState["districts"];
    seatRects: Record<string, { left: number; top: number; width: number; height: number }>;
    currentPlayerId: string;
}) => {
    const TILE_W = Math.round(1280 / 12);
    const TILE_H = Math.round(720 / 12);

    const allLines: { key: string; x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
    districts.forEach((district, d) => {
        district.locations.forEach((location, l) => {
            const seat = location.takenByPlayerID;
            if (!seat) return;
            const rect = seatRects[seat];
            if (!rect) return;
            allLines.push({
                key: `${seat}-${d}-${l}`,
                x1: rect.left + rect.width / 2,
                y1: rect.top + rect.height / 2,
                x2: district.x + locsXPos[d][l] + TILE_W / 2,
                y2: district.y + locsYPos[d][l] + TILE_H / 2,
                color: playerSeatColor(seat),
            });
        });
    });

    // A line lights up when its claim first appears (seenRef prevents old
    // claims from re-lighting when the same player gets another turn).
    const [visible, setVisible] = useState<Record<string, true>>({});
    const seenRef = useRef<Set<string>>(new Set());

    const signature = allLines.map(l => l.key).join("|");
    useEffect(() => {
        const currentKeys = new Set(allLines.map(l => l.key));
        for (const key of currentKeys) {
            if (seenRef.current.has(key)) continue;
            seenRef.current.add(key);
            setVisible(v => ({ ...v, [key]: true }));
        }
        // Claims cleared (new round): forget them so next round re-triggers.
        for (const key of [...seenRef.current]) {
            if (!currentKeys.has(key)) seenRef.current.delete(key);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signature]);

    // Turn passed: erase every line that isn't the acting player's. (Line keys
    // are `${seat}-...`; in combat phase currentPlayerId is 'all' → all erased.)
    useEffect(() => {
        setVisible(v => {
            const kept = Object.keys(v).filter(k => k.startsWith(`${currentPlayerId}-`));
            if (kept.length === Object.keys(v).length) return v;
            return Object.fromEntries(kept.map(k => [k, true])) as Record<string, true>;
        });
    }, [currentPlayerId]);

    const lines = allLines.filter(l => visible[l.key]);
    if (lines.length === 0) return null;

    return (
        <svg
            style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                zIndex: 5, // above tiles/plates, below the agents (30)
                pointerEvents: "none",
                overflow: "visible",
            }}
        >
            {lines.map(line => (
                <line
                    key={line.key}
                    className="placement-line"
                    x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                    stroke={line.color}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray="8 8"
                />
            ))}
        </svg>
    );
};

/**
 * The player's remaining agents (workers), right-justified just above the
 * resource strip. Positioned at BOARD level (not inside the portrait frame,
 * whose zIndex:1 stacking context would trap them) so agents always render
 * above every board element — district name plates, presence labels, etc.
 */
const AGENT_H = 36; // out-of-game agent sprite height
const WorkersRow = ({ count, playerId, rect }: {
    count: number;
    playerId: string;
    rect: { left: number; top: number; width: number; height: number };
}) => (
    <div
        style={{
            position: "absolute",
            left: rect.left,
            top: rect.top + rect.height - 28 - AGENT_H - 2, // above the 28px strip
            width: rect.width,
            display: "flex",
            justifyContent: "flex-end",
            paddingRight: 4,
            zIndex: 30, // above any board element
            pointerEvents: "none",
        }}
    >
        {count > 0 && (
            <div
                style={{
                    display: "flex",
                    gap: 2,
                    padding: "2px 5px",
                    backgroundColor: "rgba(90, 90, 90, 0.75)", // grayed plate over the character art
                }}
            >
                {Array.from({ length: count }).map((_, i) => (
                    <img
                        key={i}
                        src={workerIconsByPlayerId[parseInt(playerId)]}
                        className="worker-outline"
                        style={{ height: AGENT_H, width: "auto" }}
                    />
                ))}
            </div>
        )}
    </div>
);

/**
 * Turquoise plate behind a character portrait, bleeding out on every side as
 * the character area's backdrop at board level. Sits at zIndex 0 — just under
 * the portrait frame (1) and above the board background. Same for every seat:
 * the player's color lives in badges/numbers, not in this quadrant.
 */
const BACKDROP_BLEED = 16;
const PortraitBackdrop = ({ rect }: {
    rect: { left: number; top: number; width: number; height: number };
}) => (
    <div
        style={{
            position: "absolute",
            left: rect.left - BACKDROP_BLEED,
            top: rect.top - BACKDROP_BLEED,
            width: rect.width + BACKDROP_BLEED * 2,
            height: rect.height + BACKDROP_BLEED * 2,
            backgroundColor: "#40e0d0",
            border: "2px solid #000",
            zIndex: 0,
            pointerEvents: "none",
        }}
    />
);

/**
 * The cards a player played this round, as true card-proportion miniatures
 * just above the loot/candy strip (left side — the agents row owns the right
 * side). Each mini is the full CardMini rendered at natural size and shrunk
 * with transform:scale, so it keeps the real card's look and aspect ratio.
 * Hovering shows the full card in the centered preview. Board-level for the
 * same z-index reason as WorkersRow.
 */
const MINI_NATURAL_W = 105;
const MINI_NATURAL_H = 157;
const MINI_SCALE = 0.4; // → 42×63, unmistakably a little card
const MINI_W = Math.round(MINI_NATURAL_W * MINI_SCALE);
const MINI_H = Math.round(MINI_NATURAL_H * MINI_SCALE);
const CardsInPlayRow = ({ cards, rect, onHover, onLeave }: {
    cards: Card[];
    rect: { left: number; top: number; width: number; height: number };
    onHover: (card: Card) => void;
    onLeave: () => void;
}) => {
    if (cards.length === 0) return null;
    return (
        <div
            style={{
                position: "absolute",
                left: rect.left + 4,
                top: rect.top + rect.height - 28 - MINI_H - 2, // above the 28px strip
                display: "flex",
                gap: 4,
                zIndex: 30, // above any board element
                pointerEvents: "none",
            }}
        >
            {cards.map((card, i) => (
                <div
                    key={`in-play-${card.id}-${i}`}
                    style={{
                        width: MINI_W,
                        height: MINI_H,
                        overflow: "hidden",
                        pointerEvents: "auto",
                        cursor: "pointer",
                    }}
                    onMouseEnter={() => onHover(card)}
                    onMouseLeave={onLeave}
                >
                    <div style={{ transform: `scale(${MINI_SCALE})`, transformOrigin: "top left" }}>
                        {/* iconSize 40 → ~16px on screen after the 0.4 scale */}
                        <CardMini card={card} iconSize={40} showBody={false} />
                    </div>
                </div>
            ))}
        </div>
    );
};

/**
 * Big name + victory points, overlaid ON the top of the character portrait.
 */
const PortraitNamePlate = ({ name, vp, vpAnchorId }: {
    name: string;
    vp: number;
    vpAnchorId?: string;
}) => (
    <div
        style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 30,
            backgroundColor: "rgba(0, 0, 0, 0.88)",
            borderBottom: "2px solid #000",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 10px",
            zIndex: 2,
            fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
        }}
    >
        <span
            style={{
                flex: 1,
                color: "#fff",
                fontSize: 15,
                fontWeight: 900,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
            }}
        >
            {name}
        </span>
        <FlashOnChange value={vp} anchorId={vpAnchorId}>
            <span style={{ fontSize: 19, fontWeight: 900, color: "#fde047" }}>
                {vp}<span style={{ fontSize: 11, color: "#ccc", marginLeft: 2 }}>VP</span>
            </span>
        </FlashOnChange>
    </div>
);

/**
 * Black strip overlaid ON the bottom of the character portrait — the home of
 * the player's loot (yellow) and candy (pink) values.
 */
const PortraitResourceStrip = ({ candy, loot, candyAnchorId, lootAnchorId }: {
    candy: number;
    loot: number;
    candyAnchorId?: string;
    lootAnchorId?: string;
}) => (
    <div
        style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 28,
            backgroundColor: "rgba(0, 0, 0, 0.88)",
            borderTop: "2px solid #000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            zIndex: 2,
            fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
            fontSize: 14,
            fontWeight: 900,
        }}
    >
        <FlashOnChange value={loot} anchorId={lootAnchorId}>
            <span style={{ color: "#fde047" }}>💰 {loot}</span>
        </FlashOnChange>
        <FlashOnChange value={candy} anchorId={candyAnchorId}>
            <span style={{ color: "#f9a8d4" }}>🍬 {candy}</span>
        </FlashOnChange>
    </div>
);

/**
 * Neobrutalist turn-order marker pinned to the portrait's top-left: the round's
 * first player gets a turquoise "1st" chip, everyone else their position in gray.
 */
const ORDINALS = ["1st", "2nd", "3rd", "4th"];
const TurnOrderBadge = ({ position }: { position: number }) => {
    const isFirst = position === 1;
    return (
        <div
            className={isFirst ? "first-player-badge" : "turn-order-badge"}
            title={isFirst ? "First player" : `Plays ${ORDINALS[position - 1] ?? position}`}
            style={{
                position: "absolute",
                top: -30, // fully above the portrait frame, not over the character art
                left: -8,
                height: 22,
                padding: "0 6px",
                backgroundColor: isFirst ? "#40e0d0" : "#d4d4d4",
                border: "2px solid #000",
                boxShadow: "2px 2px 0 #000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 900,
                color: isFirst ? "#000" : "#555",
                fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
                zIndex: 3,
                pointerEvents: "none",
                userSelect: "none",
            }}
        >
            {ORDINALS[position - 1] ?? `${position}th`}
        </div>
    );
};

/**
 * District chips pinned down the portrait's top-right edge (just under the
 * name plate): one per district this player currently dominates.
 */
const DominanceBadges = ({ districtIds }: { districtIds?: string[] }) => {
    if (!districtIds?.length) return null;
    return (
        <div
            style={{
                position: "absolute",
                top: 34, // just below the 30px name plate
                right: -8,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                zIndex: 3,
                pointerEvents: "none",
            }}
        >
            {districtIds.map(id => (
                <div
                    key={`dominance-${id}`}
                    title={`Dominating ${id}`}
                    style={{
                        width: 36,
                        height: 36,
                        backgroundColor: "#fff",
                        border: "2px solid #000",
                        boxShadow: "2px 2px 0 #000",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <DistrictIcon districtId={id} size="lg" />
                </div>
            ))}
        </div>
    );
};

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

// ─── Reveal resolution modal ──────────────────────────────────────────────────

/**
 * Resolves the reveal effects of the revealed hand before the move fires:
 * · resource reveals (+1 candy…) are informational — applied automatically;
 * · "+1 Fight" picks a district AMONG THOSE WITH THE PLAYER'S AGENTS;
 * · the Puzzle expands into a hand-card selection that must complete the
 *   challenge (4 distinct symbols + 2 "? ?" wildcards) to score its VP.
 */
const RevealResolutionModal = ({ G, player, onConfirm, onCancel }: {
    G: GameState;
    player: PlayerGameState;
    onConfirm: (revealParams: RevealMoveParams) => void;
    onCancel: () => void;
}) => {
    const t = useT();
    const hand = player.hand ?? [];
    const resourceCards = hand.filter(c => (c.secondaryResources?.length ?? 0) > 0);
    const fightCard = hand.find(c => revealEffectOf(c) === "fight");
    const puzzleCard = hand.find(c => revealEffectOf(c) === "puzzle");
    const eligible = useMemo(() => eligibleFightDistricts(G, player), [G, player]);

    const [fightDistrict, setFightDistrict] = useState<string | null>(
        eligible.length === 1 ? eligible[0] : null
    );
    const [puzzleOpen, setPuzzleOpen] = useState(false);
    const [puzzleSelection, setPuzzleSelection] = useState<Set<string>>(new Set());

    const puzzleCandidates = puzzleCard ? hand.filter(c => c.id !== puzzleCard.id) : [];
    const selectedCards = puzzleCandidates.filter(c => puzzleSelection.has(c.id));
    const puzzleComplete = puzzleCard ? isPuzzleSolved(selectedCards) : false;

    const needsFightPick = !!fightCard && eligible.length > 0;
    const canConfirm = !needsFightPick || fightDistrict !== null;

    const togglePuzzleCard = (cardId: string) =>
        setPuzzleSelection(current => {
            const next = new Set(current);
            if (next.has(cardId)) next.delete(cardId);
            else next.add(cardId);
            return next;
        });

    const confirm = () => {
        if (!canConfirm) return;
        onConfirm({
            ...(fightCard && fightDistrict ? { fightDistricts: { [fightCard.id]: fightDistrict } } : {}),
            ...(puzzleCard && puzzleComplete
                ? { puzzleSelections: { [puzzleCard.id]: selectedCards.map(c => c.id) } }
                : {}),
        });
    };

    const sectionStyle: React.CSSProperties = {
        border: "2px solid #000", padding: "10px 12px", backgroundColor: "#fafafa",
        display: "flex", flexDirection: "column", gap: 8,
    };
    const sectionTitleStyle: React.CSSProperties = {
        fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em",
    };

    return (
        <div
            onClick={onCancel}
            style={{
                position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)",
                display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    backgroundColor: "#fff", border: "2px solid #000", boxShadow: "6px 6px 0 #000",
                    padding: 20, fontFamily: nb.font, display: "flex", flexDirection: "column",
                    gap: 14, width: "min(560px, 92%)", maxHeight: "88%", overflowY: "auto",
                }}
            >
                <div style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    👁 {t("game.revealTitle")}
                </div>

                {/* Automatic resource reveals — informational */}
                {resourceCards.map(card => (
                    <div key={card.id} style={{ ...sectionStyle, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, fontWeight: 800 }}>
                            {card.secondaryResources!.map(r => `+${r.amount} ${r.resourceId}`).join(", ")}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#777" }}>
                            {t("game.revealAuto")}
                        </span>
                    </div>
                ))}

                {/* +1 Fight — only districts holding the player's agents */}
                {fightCard && (
                    <div style={sectionStyle}>
                        <div style={sectionTitleStyle}>⚔ {t("game.fightDistrictTitle")}</div>
                        {eligible.length === 0 ? (
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#991b1b" }}>
                                {t("game.fightNoAgents")}
                            </div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                {G.districts.filter(d => eligible.includes(d.id)).map(district => {
                                    const active = fightDistrict === district.id;
                                    return (
                                        <button
                                            key={district.id}
                                            onClick={() => setFightDistrict(district.id)}
                                            style={{
                                                display: "flex", alignItems: "center", gap: 8,
                                                border: "2px solid #000",
                                                boxShadow: active ? "none" : "3px 3px 0 #000",
                                                transform: active ? "translate(3px, 3px)" : undefined,
                                                backgroundColor: active ? "#40e0d0" : "#fff",
                                                padding: "8px 12px", cursor: "pointer",
                                                fontFamily: nb.font, fontSize: 12, fontWeight: 800,
                                            }}
                                        >
                                            <DistrictIcon districtId={district.id} size="md" />
                                            {district.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Puzzle — expand and select the contributing cards */}
                {puzzleCard && (
                    <div style={sectionStyle}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <div style={sectionTitleStyle}>🧩 Puzzle</div>
                            <PuzzleRequirement iconSize={16} />
                        </div>
                        {!puzzleOpen ? (
                            <button
                                onClick={() => setPuzzleOpen(true)}
                                style={{
                                    border: "2px solid #000", boxShadow: "3px 3px 0 #000",
                                    backgroundColor: "#fef08a", padding: "8px 12px", cursor: "pointer",
                                    fontFamily: nb.font, fontSize: 12, fontWeight: 800,
                                }}
                            >
                                {t("game.puzzleResolve")}
                            </button>
                        ) : (
                            <>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {puzzleCandidates.map(card => {
                                        const selected = puzzleSelection.has(card.id);
                                        return (
                                            <div
                                                key={card.id}
                                                onClick={() => togglePuzzleCard(card.id)}
                                                style={{
                                                    cursor: "pointer",
                                                    outline: selected ? "3px solid #40e0d0" : "3px solid transparent",
                                                    filter: selected ? "none" : "grayscale(0.4)",
                                                }}
                                            >
                                                <CardMini card={card} width={64} height={96} iconSize={11} showBody={false} />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{
                                    fontSize: 11, fontWeight: 900,
                                    color: puzzleComplete ? "#166534" : "#991b1b",
                                }}>
                                    {puzzleComplete ? `✔ ${t("game.puzzleComplete")}` : `✗ ${t("game.puzzleIncomplete")}`}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button
                        onClick={onCancel}
                        style={{
                            border: "2px solid #000", boxShadow: "3px 3px 0 #000", backgroundColor: "#fff",
                            padding: "8px 16px", cursor: "pointer", fontFamily: nb.font, fontSize: 12, fontWeight: 800,
                        }}
                    >
                        {t("game.cancel")}
                    </button>
                    <button
                        onClick={confirm}
                        disabled={!canConfirm}
                        style={{
                            border: "2px solid #000", boxShadow: canConfirm ? "3px 3px 0 #000" : "none",
                            backgroundColor: canConfirm ? "#000" : "#ccc",
                            color: canConfirm ? "#fff" : "#888",
                            padding: "8px 20px", cursor: canConfirm ? "pointer" : "not-allowed",
                            fontFamily: nb.font, fontSize: 12, fontWeight: 900,
                            textTransform: "uppercase", letterSpacing: "0.05em",
                        }}
                    >
                        👁 {t("game.revealConfirm")}
                    </button>
                </div>
            </div>
        </div>
    );
};

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
        <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.07em", color: "#999" }}>{label}</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: "#eee" }}>{value}</span>
    </div>
);

const PileSection = ({ title, cards }: { title: string; cards: Card[] }) => (
    <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", marginBottom: 10 }}>
            {title} <span style={{ color: "#777", fontWeight: 400 }}>({cards.length})</span>
        </div>
        {cards.length === 0 ? (
            <div style={{ fontSize: 11, color: "#888", fontStyle: "italic" }}>Empty</div>
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
                    backgroundColor: "#111",
                    color: "#eee",
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
                                borderRight: i < arr.length - 1 ? "1px solid #333" : "none",
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
                            backgroundColor: "#1c1626",
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
                            <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a78bfa" }}>
                                {t("characterModal.signetTitle")}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#eee", marginTop: 2 }}>
                                {t(`character.${data.characterId}.signet`)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Piles */}
                <div style={{ padding: "16px 18px" }}>
                    {data.hasRevealed && (
                        <div style={{ marginBottom: 14, fontSize: 11, fontWeight: 700, color: "#aaa" }}>
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
