import { memo, useCallback, useMemo, useState } from "react";
import { Card, GameState, PlayerGameState, PlayerViewModel } from "@candyfight/shared/types"
import { WorkerComponent } from "../icon-components/WorkerComponent"
import { CardComponent } from "../card-components/CardComponent";
import { CharacterEnum } from "@candyfight/shared/enums";
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
}

const PilePopover = memo(({ cards, label, count, onHover, onLeave }: PilePopoverProps) => (
    <div
        style={{ position: 'relative' }}
        onMouseEnter={() => cards.length > 0 && onHover(cards, label)}
        onMouseLeave={onLeave}
    >
        <div>{label}<hr /><div>{count}</div></div>
    </div>
));

PilePopover.displayName = "PilePopover";

/**
 * Hand card that calls parent callbacks on hover — renders no overlay itself.
 */
interface HandCardWrapperProps {
    card: Card;
    index: number;
    isDisabled: boolean;
    isSelected: boolean;
    onClick: () => void;
    onHover: (card: Card) => void;
    onLeave: () => void;
}

const HandCardWrapper = memo(({ card, index, isDisabled, isSelected, onClick, onHover, onLeave }: HandCardWrapperProps) => (
    <div
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
}

export const PlayerAreaComponent = memo(({
    G,
    player,
    moves,
    selectedCard,
    playerView,
    playerNames,
    currentPlayerId,
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

    const onPileHover = useCallback((cards: Card[], title: string) => {
        const sorted = [...cards].sort((a, b) => a.name.localeCompare(b.name));
        setPileOverlay({ cards: sorted, title });
    }, []);
    const onPileLeave = useCallback(() => setPileOverlay(null), []);

    const onCardHover = useCallback((card: Card) => setHoveredCard(card), []);
    const onCardLeave = useCallback(() => setHoveredCard(null), []);

    return (<>
        {/* Character portraits — rendered first so they sit behind all other board elements */}
        {player.characterId && characterImageMap[player.characterId] && (
            <div
                className={`current-player-portrait-frame${currentPlayerId === 'all' || player.id === currentPlayerId ? " proto-glow" : ""}`}
                style={{
                    position: "absolute",
                    left: PORTRAIT_CURRENT.left,
                    top: PORTRAIT_CURRENT.top,
                    width: PORTRAIT_CURRENT.width,
                    height: PORTRAIT_CURRENT.height,
                    zIndex: 1,
                }}
            >
                <div className="portrait-clip">
                    <img
                        src={characterImageMap[player.characterId]}
                        alt="your character"
                    />
                </div>
            </div>
        )}
        {enemies.map((enemy, seatIndex) => {
            const slot = PORTRAIT_ENEMIES[seatIndex];
            if (!slot || !enemy.characterId || !characterImageMap[enemy.characterId]) return null;
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
                    }}
                >
                    <div className="portrait-clip">
                        <img
                            src={characterImageMap[enemy.characterId]}
                            alt="enemy character"
                        />
                    </div>
                </div>
            );
        })}

        <WorkerComponent
            numerOfWorkers={player.currentNumberOfWorkers}
            x={281} y={463}
            mirror={0}
            playerID={parseInt(player.id!)}
        />

        {/* Current Player Resources */}
        <div className="player-resource-container absolute">
            <div className="victory-points">{player.victoryPoints}</div>
            <div>Candy<hr /><div>{player.candy}</div></div>
            <div>Loot<hr /><div>{player.loot}</div></div>
            <PilePopover cards={player.deck} label="Deck" count={player.deck.length} onHover={onPileHover} onLeave={onPileLeave} />
            <PilePopover cards={player.discardPile} label="Discard" count={player.discardPile.length} onHover={onPileHover} onLeave={onPileLeave} />
            <PilePopover cards={player.trashPile} label="Trash" count={player.trashPile.length} onHover={onPileHover} onLeave={onPileLeave} />
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
                    onClick={() => onSelectCard(card)}
                    onHover={onCardHover}
                    onLeave={onCardLeave}
                />
            ))}
        </div>

        {/* Action Buttons */}
        <div
            className={`pass-btn${!player.hasPlayedCard ? " disabled" : ""}`}
            onClick={player.hasPlayedCard ? onPass : undefined}
        />
        <div className="reveal-btn" onClick={onReveal} />

        {/* Board-level: pile overlay (centered, styled like market modal) */}
        {pileOverlay && (
            <div className="pile-modal">
                <div className="pile-modal-title">{pileOverlay.title}</div>
                <div className="pile-modal-subtitle">
                    {pileOverlay.cards.length} card{pileOverlay.cards.length !== 1 ? 's' : ''}
                </div>
                <div className="pile-modal-cards">
                    {pileOverlay.cards.map((card, i) => (
                        <div key={`pile-card-${card.id}-${i}`} className="pile-card-slot">
                            <CardComponent card={card} x={0} y={0} w={90} h={268} show={true} />
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
