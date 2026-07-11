import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card, GameState, PlayerGameState, PlayerViewModel, isFullPlayerState } from "@candyfight/shared/types"
import { WorkerComponent } from "../icon-components/WorkerComponent"
import { workerIconsByPlayerId } from "../icon-components/constants";
import { locsXPos, locsYPos } from "../board-component/constants";
import { playerSeatColor, seatRing } from "@candyfight/shared/constants";
import { calculateCombatWinner } from "@candyfight/shared/game-helper";
import { DistrictIcon } from "../ui/GameIcon";
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

const PORTRAIT_CURRENT_LEFT = 52;
const PORTRAIT_CURRENT = { left: PORTRAIT_CURRENT_LEFT, top: P_BOT_Y, width: P_W, height: P_H };
// Enemy slots follow the turn ring from the viewer's seat (bottom-left):
// whoever plays right after me sits top-left, then top-right, then
// bottom-right — the turn glow orbits bottom-left → top-left → top-right →
// bottom-right on EVERY viewer's screen.
// Exception: with a single enemy (2P) they sit top-right, face to face.
const PORTRAIT_ENEMIES = [
    // slot 0 (top-left): aligned with the current player's portrait so it
    // clears its own deck/discard/trash panel on the right
    { left: PORTRAIT_CURRENT_LEFT, top: P_TOP_Y, width: P_W, height: P_H },
    { left: P_RIGHT_X, top: P_TOP_Y, width: P_W, height: P_H }, // slot 1: top-right
    { left: P_RIGHT_X, top: P_BOT_Y, width: P_W, height: P_H }, // slot 2: bottom-right
];

// Stats panel positions: right-column portraits → stats to the LEFT; left-column → stats to the RIGHT.
// Top slots sit beside the lower half of the portrait, clear of the turquoise
// backdrop plate (which bleeds BACKDROP_BLEED px past the frame on every side).
const STATS_W = 35; // matches .player-resource-container width in CSS
const STATS_BELOW_Y = P_TOP_Y + 80; // beside the lower half of the top portraits, clear of the plate's top ornaments
const ENEMY_STATS_POSITIONS = [
    // slot 0 (top-left): just right of the plate edge (52 + 190 + 16 bleed + gap)
    { left: 262, top: STATS_BELOW_Y },
    { left: P_RIGHT_X - STATS_W - 20, top: STATS_BELOW_Y }, // slot 1: top-right
    // slot 2 (bottom-right): aligned with the current player's panel (y=310)
    { left: P_RIGHT_X - STATS_W - 20, top: 310 },
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
    // from the round's first player. Drives the 1st/2nd/3rd/4th badges.
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
        <WorkersRow count={player.currentNumberOfWorkers} playerId={player.id} rect={PORTRAIT_CURRENT} />
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
        <PlacementLinesOverlay districts={G.districts} seatRects={seatRects} />

        <WorkerComponent
            numerOfWorkers={player.currentNumberOfWorkers}
            x={281} y={463}
            mirror={0}
            playerID={parseInt(player.id!)}
            tutorAnchorId={anchors.workerPool(player.id)}
        />

        {/* Current Player Resources — candy/loot/VP live on the portrait overlays now */}
        <div className="player-resource-container absolute">
            <div>Hand<hr /><div>{player.hand?.length ?? 0}</div></div>
            <PilePopover cards={player.deck} label="Deck" count={player.deck.length} onHover={onPileHover} onLeave={onPileLeave} shuffle anchorId={anchors.pile(player.id, "deck")} />
            <PilePopover cards={player.discardPile} label="Discard" count={player.discardPile.length} onHover={onPileHover} onLeave={onPileLeave} anchorId={anchors.pile(player.id, "discard")} />
            <PilePopover cards={player.trashPile} label="Trash" count={player.trashPile.length} onHover={onPileHover} onLeave={onPileLeave} anchorId={anchors.pile(player.id, "trash")} />
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

        {/* Action Buttons */}
        <div
            data-tutor-id={anchors.passButton()}
            className={`pass-btn${!player.hasPlayedCard ? " disabled" : ""}${player.hasPlayedCard && player.currentNumberOfWorkers === 0 ? " should-glow" : ""}`}
            onClick={player.hasPlayedCard ? onPass : undefined}
        />
        <div
            data-tutor-id={anchors.revealButton()}
            className={`reveal-btn${player.hasPlayedCard ? " disabled" : ""}${!player.hasPlayedCard && player.currentNumberOfWorkers === 0 ? " should-glow" : ""}`}
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
        <div className={`bg-player-${enemy.id}`} style={{ height: "3px", width: "100%", marginBottom: "4px" }} />
        <div>Hand<hr /><div>{enemy.handLength}</div></div>
        <div>Deck<hr /><div>{enemy.deckLength}</div></div>
        <PilePopover cards={enemy.discardPile} label="Discard" count={enemy.discardPile.length} onHover={onPileHover} onLeave={onPileLeave} />
        <PilePopover cards={enemy.trashPile} label="Trash" count={enemy.trashPile.length} onHover={onPileHover} onLeave={onPileLeave} />
    </div>
));

EnemyResourceDisplay.displayName = "EnemyResourceDisplay";

// ─── Portrait Info Icon ───────────────────────────────────────────────────────

/**
 * Animated dotted line from a character portrait to the location they just
 * played, in the player's seat color — a TEMPORARY indicator: each line shows
 * when the claim happens and fades out after a few seconds.
 */
const PLACEMENT_LINE_TTL_MS = 4000;

const PlacementLinesOverlay = ({ districts, seatRects }: {
    districts: GameState["districts"];
    seatRects: Record<string, { left: number; top: number; width: number; height: number }>;
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

    // Temporary visibility: a line lights up when its claim first appears and
    // expires after the TTL. Timers live across renders; cleared on unmount.
    const [visible, setVisible] = useState<Record<string, true>>({});
    const seenRef = useRef<Set<string>>(new Set());
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

    const signature = allLines.map(l => l.key).join("|");
    useEffect(() => {
        const currentKeys = new Set(allLines.map(l => l.key));
        for (const key of currentKeys) {
            if (seenRef.current.has(key)) continue;
            seenRef.current.add(key);
            setVisible(v => ({ ...v, [key]: true }));
            timersRef.current.set(key, setTimeout(() => {
                timersRef.current.delete(key);
                setVisible(v => {
                    const { [key]: _gone, ...rest } = v;
                    return rest as Record<string, true>;
                });
            }, PLACEMENT_LINE_TTL_MS));
        }
        // Claims cleared (new round): forget them so next round re-triggers.
        for (const key of [...seenRef.current]) {
            if (!currentKeys.has(key)) seenRef.current.delete(key);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signature]);

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
            gap: 2,
            zIndex: 30, // above any board element
            pointerEvents: "none",
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
                top: -8,
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
                        width: 24,
                        height: 24,
                        backgroundColor: "#fff",
                        border: "2px solid #000",
                        boxShadow: "2px 2px 0 #000",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <DistrictIcon districtId={id} size="sm" />
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
