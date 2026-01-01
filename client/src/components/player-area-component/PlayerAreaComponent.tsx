import { Button, Dialog, Flex, Tooltip } from "@radix-ui/themes";
import { Card, GameState, PlayerGameState, PlayerViewModel } from "../../../../shared/types"
import { useBoardComponent } from "../board-component/UseBoardComponent";
import { WorkerComponent } from "../icon-components/WorkerComponent"
import { CardComponent } from "../card-components/CardComponent";
import { CardSelectionModalOptions } from "../board-component/types";
import "./PlayerAreaComponent.scss"

export type PlayerAreaComponentProps = {
    G: GameState;
    player: PlayerGameState;
    events: any;
    moves: any;
    cardSelectionModalOptions: CardSelectionModalOptions;
    selectedCard?: Card;
    playerView: PlayerViewModel[];
    onSelectToDiscard: (selectedCard: Card, limit: number) => void;
    confirmCardSelection: () => void;
    cancelCardSelection: () => void;
}

export const PlayerAreaComponent = ({
    G,
    player,
    events,
    moves,
    cardSelectionModalOptions,
    selectedCard,
    playerView,
    onSelectToDiscard,
    confirmCardSelection,
    cancelCardSelection,
}: PlayerAreaComponentProps) => {

    const { Hud } = useBoardComponent();

    const onSelectCard = (selectedCard: Card) => {
        moves.selectCard(G, selectedCard)
    }

    const onPass = () => G.playersViewModel.filter(p => !p.hasRevealed).length == 1 ? null : events.endTurn();
    
    const onReveal = () => moves.reveal();
    
    return (<>
        <WorkerComponent
            numerOfWorkers={player.currentNumberOfWorkers}
            x={281} y={463}
            mirror={0}
            playerID={parseInt(player.id!)}
            />  
            <div className="player-resource-container absolute">
                    <div className="victory-points">{player.victoryPoints}</div>
                    <div>Candy<hr /><div>{player.candy}</div></div>
                    <div>Loot<hr /><div>{player.loot}</div></div>        
                    <div>Deck<hr /><div>{player.deck.length}</div></div>        
                    <Tooltip content={player.discardPile.length > 0 ? player.discardPile.map(t => t.name).join(" - ") : "Discard Pile"}><div>Discard<hr /><div>{player.discardPile.length}</div></div></Tooltip>  
                    <Tooltip content={player.trashPile.length > 0 ? player.trashPile.map(t => t.name).join(" - ") : "Trash Pile"}><div>Trash<hr /><div>{player.trashPile.length}</div></div></Tooltip>   
                </div>            
            {playerView.filter(p => p.id != player.id).map((enemy, seatIndex) => (
                // if (player.id != player.id)
                <div className="player-resource-container absolute" style={{
                    top: seatIndex == 0 || seatIndex == 2 ? 90 : 0, left: seatIndex == 0 ? 968 : 260, fontSize: "7px"
                }}>
                    <div className="enemy victory-points">{player.victoryPoints}</div>
                    <div>Candy<hr /><div>{player.candy}</div></div>
                    <div>Loot<hr /><div>{player.loot}</div></div>        
                    <div>Deck<hr /><div>{player.deck.length}</div></div>        
                    <Tooltip content={player.discardPile.length > 0 ? player.discardPile.map(t => t.name).join(" - ") : "Discard Pile"}><div>Discard<hr /><div>{player.discardPile.length}</div></div></Tooltip>  
                    <Tooltip content={player.trashPile.length > 0 ? player.trashPile.map(t => t.name).join(" - ") : "Trash Pile"}><div>Trash<hr /><div>{player.trashPile.length}</div></div></Tooltip>   
                </div>
            ))}
    
            <div className="hand-container" style={{
            width: "200px", position: "relative", top: "-14px"
            }}>

            {!cardSelectionModalOptions.isOpen ? player.hand?.map((card: Card, index) => 
                
                // hand
                <CardComponent
                    isDisabled={player.currentNumberOfWorkers == 0}
                    isSelected={card?.id == selectedCard?.id}
                    y={540} x={390 + index*105} show={true} 
                    key={`card-${card?.id}-${index}`} 
                    onClick={() => onSelectCard(card)}
                    card={card}
                >
                </CardComponent>
            ) :
            (
            // card selection for discard or trash
            <Dialog.Root open={cardSelectionModalOptions.isOpen}>

                <Dialog.Content height={"300px"} maxWidth={"1000px"}>
                <Dialog.Title><Flex justify={"center"}>{cardSelectionModalOptions.actionName}</Flex></Dialog.Title>
                <Flex>
                    {cardSelectionModalOptions.cardOptions.map((card, index) => (
                    <CardComponent
                        isSelected={cardSelectionModalOptions.cardsSelected?.map(c => c.id).includes(card.id)}
                        y={120} x={20 + index*105} show={true} 
                        key={`select-card-${card.id}-${index }`} 
                        onClick={() => onSelectToDiscard(card, cardSelectionModalOptions.selectionLimit)}
                        card={card}
                        selectionColor={"red"}
                    >
                    </CardComponent>
                    ))}
                </Flex>

                <Flex gap="3" justify="center">
                    <Dialog.Close>
                    <Button variant="soft" color="gray" onClick={confirmCardSelection}>
                        Confirm Selection
                    </Button>
                    </Dialog.Close>
                    <Dialog.Close>
                    <Button onClick={cancelCardSelection}>Cancel Selection</Button>
                    </Dialog.Close>
                </Flex>
                </Dialog.Content>
            </Dialog.Root>
            )}  
            </div>
            <div className="pass-btn" onClick={onPass} />
            <div className="reveal-btn" onClick={onReveal} />
        </>
    )
}