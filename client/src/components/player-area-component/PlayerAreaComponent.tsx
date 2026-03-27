import { memo, useCallback, useMemo } from "react";
import { Tooltip } from "@radix-ui/themes";
import { Card, GameState, PlayerGameState, PlayerViewModel } from "@candyfight/shared/types"
import { WorkerComponent } from "../icon-components/WorkerComponent"
import { CardComponent } from "../card-components/CardComponent";

export type PlayerAreaComponentProps = {
    G: GameState;
    player: PlayerGameState;
    moves: any;
    selectedCard?: Card;
    playerView: PlayerViewModel[];
}

export const PlayerAreaComponent = memo(({
    G,
    player,
    moves,
    selectedCard,
    playerView,
}: PlayerAreaComponentProps) => {
    // Stable callbacks - no longer depend on G changing every render
    const onSelectCard = useCallback((card: Card) => {
        moves.selectCard(card);
    }, [moves]);

    const onPass = useCallback(() => moves.pass(), [moves]);

    const onReveal = useCallback(() => moves.reveal(), [moves]);

    // Memoize tooltip content strings
    const discardPileTooltip = useMemo(() =>
        player.discardPile.length > 0 ? player.discardPile.map(t => t.name).join(" - ") : "Discard Pile",
        [player.discardPile]
    );

    const trashPileTooltip = useMemo(() =>
        player.trashPile.length > 0 ? player.trashPile.map(t => t.name).join(" - ") : "Trash Pile",
        [player.trashPile]
    );

    // Memoize enemies list
    const enemies = useMemo(() =>
        playerView.filter(p => p.id !== player.id),
        [playerView, player.id]
    );

    return (<>
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
            <div>Deck<hr /><div>{player.deck.length}</div></div>
            <Tooltip content={discardPileTooltip}>
                <div>Discard<hr /><div>{player.discardPile.length}</div></div>
            </Tooltip>
            <Tooltip content={trashPileTooltip}>
                <div>Trash<hr /><div>{player.trashPile.length}</div></div>
            </Tooltip>
        </div>

        {/* Enemy Player Resources */}
        {enemies.map((enemy, seatIndex) => (
            <EnemyResourceDisplay
                key={`enemy-${enemy.id}`}
                enemy={enemy}
                seatIndex={seatIndex}
            />
        ))}

        {/* Player Hand */}
        <div className="hand-container" style={{
            width: "200px", position: "relative", top: "-14px"
        }}>
            {player.hand?.map((card: Card, index) => (
                <CardComponent
                    isDisabled={player.currentNumberOfWorkers == 0}
                    isSelected={card?.id == selectedCard?.id}
                    y={540} x={390 + index * 105} show={true}
                    key={`card-${card?.id}-${index}`}
                    onClick={() => onSelectCard(card)}
                    card={card}
                />
            ))}
        </div>

        {/* Action Buttons */}
        <div
            className={`pass-btn${!player.hasPlayedCard ? " disabled" : ""}`}
            onClick={player.hasPlayedCard ? onPass : undefined}
        />
        <div className="reveal-btn" onClick={onReveal} />
    </>);
});

PlayerAreaComponent.displayName = "PlayerAreaComponent";

/**
 * Memoized enemy resource display component
 */
interface EnemyResourceDisplayProps {
    enemy: PlayerViewModel;
    seatIndex: number;
}

const EnemyResourceDisplay = memo(({ enemy, seatIndex }: EnemyResourceDisplayProps) => {
    const discardTooltip = useMemo(() =>
        enemy.discardPile.length > 0 ? enemy.discardPile.map(t => t.name).join(" - ") : "Discard Pile",
        [enemy.discardPile]
    );

    const trashTooltip = useMemo(() =>
        enemy.trashPile.length > 0 ? enemy.trashPile.map(t => t.name).join(" - ") : "Trash Pile",
        [enemy.trashPile]
    );

    return (
        <div
            className="player-resource-container absolute"
            style={{
                top: seatIndex === 0 || seatIndex === 2 ? 90 : 0,
                left: seatIndex === 0 ? 968 : 260,
                fontSize: "7px"
            }}
        >
            <div className="enemy victory-points">{enemy.victoryPoints}</div>
            <div>Candy<hr /><div>{enemy.candy}</div></div>
            <div>Loot<hr /><div>{enemy.loot}</div></div>
            <div>Deck<hr /><div>{enemy.deckLength}</div></div>
            <Tooltip content={discardTooltip}>
                <div>Discard<hr /><div>{enemy.discardPile.length}</div></div>
            </Tooltip>
            <Tooltip content={trashTooltip}>
                <div>Trash<hr /><div>{enemy.trashPile.length}</div></div>
            </Tooltip>
        </div>
    );
});

EnemyResourceDisplay.displayName = "EnemyResourceDisplay";
