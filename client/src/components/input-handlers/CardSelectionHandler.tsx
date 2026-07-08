/**
 * Card Selection Handler
 *
 * UI component for selecting cards from the player's hand.
 * Used for DISCARD, TRASH, and similar actions.
 */

import { useState, useMemo, useEffect } from "react";
import { Button, Dialog, Flex } from "@radix-ui/themes";
import { Card } from "@candyfight/shared/types";
import { CardSelectionInputSpec, isCardSelectionSpec } from "@candyfight/shared/actions";
import { InputHandlerProps, CardSelectionResult, inputHandlerRegistry } from "../../actions/input-handlers";
import { CardComponent } from "../card-components/CardComponent";
import { anchors } from "@candyfight/shared/tutorial/types";

export interface CardSelectionHandlerProps extends InputHandlerProps<CardSelectionResult> {
  /** Title to display in the modal */
  title?: string;
}

export function CardSelectionHandler({
  inputSpec,
  player,
  onComplete,
  onCancel,
  minCount,
  maxCount,
  excludeCardId,
  marketCards,
  highlightCardId,
  lockToCardIds,
  title,
}: CardSelectionHandlerProps) {
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);

  // The orchestrator unmounts this dialog (open={true}) the instant a selection
  // completes, rather than animating it closed. Radix can leave `pointer-events:
  // none` on <body> in that case, which freezes the whole page (e.g. you can't
  // return to the menu after buying in the tutorial). Restore it on unmount.
  useEffect(() => () => {
    if (document.body.style.pointerEvents === "none") {
      document.body.style.pointerEvents = "";
    }
  }, []);

  // Tutorial gating: when a lock list is present, only those cards are selectable.
  const lockSet = lockToCardIds ? new Set(lockToCardIds) : null;
  const isLocked = (cardId: string) => lockSet !== null && !lockSet.has(cardId);

  // Get card selection specific spec
  const cardSpec = isCardSelectionSpec(inputSpec) ? inputSpec : null;

  // Determine source cards
  const sourceCards = useMemo(() => {
    if (!cardSpec) return [];

    let cards: Card[] = [];
    switch (cardSpec.source) {
      case 'hand':
        cards = [...player.hand];
        break;
      case 'discard':
        cards = [...player.discardPile];
        break;
      case 'deck':
        cards = [...player.deck];
        break;
      case 'market':
        cards = [...(marketCards ?? [])];
        break;
      default:
        cards = [...player.hand];
    }

    // Apply filters
    if (cardSpec.filter?.excludePlayedCard && excludeCardId) {
      cards = cards.filter(c => c.id !== excludeCardId);
    }

    if (cardSpec.filter?.excludeCardIds) {
      const excludeSet = new Set(cardSpec.filter.excludeCardIds);
      cards = cards.filter(c => !excludeSet.has(c.id));
    }

    if (cardSpec.filter?.districtIds) {
      const districtSet = new Set(cardSpec.filter.districtIds);
      cards = cards.filter(c => c.districtIds.some(d => districtSet.has(d)));
    }

    return cards;
  }, [cardSpec, player, excludeCardId, marketCards]);

  // Selection limits
  const effectiveMinCount = minCount ?? cardSpec?.minCount ?? 1;
  const effectiveMaxCount = maxCount ?? cardSpec?.maxCount ?? 1;

  // Handle card click
  const handleCardClick = (card: Card) => {
    if (isLocked(card.id)) return; // tutorial: non-target cards are not selectable
    const isSelected = selectedCards.some(c => c.id === card.id);

    if (isSelected) {
      // Deselect
      setSelectedCards(prev => prev.filter(c => c.id !== card.id));
    } else if (selectedCards.length < effectiveMaxCount) {
      // Select if under limit
      setSelectedCards(prev => [...prev, card]);
    }
  };

  // Check if selection is valid
  const canConfirm = selectedCards.length >= effectiveMinCount && selectedCards.length <= effectiveMaxCount;

  // Handle confirm
  const handleConfirm = () => {
    if (canConfirm) {
      onComplete({
        cardIds: selectedCards.map(c => c.id),
        cards: selectedCards,
      });
    }
  };

  // Get display title
  const displayTitle = title ?? cardSpec?.label ?? getDefaultTitle(inputSpec);

  const isMarketSource = cardSpec?.source === 'market';
  const marketDeckRemaining = isMarketSource && marketCards
    ? Math.max(0, marketCards.length - sourceCards.length)
    : 0;

  return (
    <Dialog.Root open={true}>
      <Dialog.Content style={{ maxWidth: "900px" }}>
        <Dialog.Title>
          <Flex justify="center">{displayTitle}</Flex>
        </Dialog.Title>
        {isMarketSource && (
          <Flex justify="center" style={{ fontSize: "12px", color: "gray", marginBottom: "8px" }}>
            {sourceCards.length} available · {marketDeckRemaining} more in deck
          </Flex>
        )}

        <Flex gap="2" justify="center" wrap="wrap">
          {sourceCards.map((card, index) => (
            <div key={`select-card-${card.id}-${index}`} data-tutor-id={anchors.pileCard(card.id)} className={highlightCardId === card.id ? "tutor-card-highlight" : undefined} style={{ position: "relative", width: 90, height: 157 }}>
              <CardComponent
                card={card}
                isSelected={selectedCards.some(c => c.id === card.id)}
                isDisabled={isLocked(card.id)}
                w={90}
                h={157}
                y={0}
                x={0}
                show={true}
                onClick={() => handleCardClick(card)}
                selectionColor="red"
              />
            </div>
          ))}
        </Flex>

        <Flex gap="3" justify="center" style={{ marginTop: "20px" }}>
          <Button
            variant="soft"
            color="gray"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            Confirm Selection ({selectedCards.length}/{effectiveMinCount})
          </Button>
          <Button onClick={onCancel}>
            Cancel
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

/**
 * Get default title based on input spec
 */
function getDefaultTitle(inputSpec: any): string {
  if (inputSpec.inputType === 'cardSelection') {
    if (inputSpec.source === 'market') return 'Choose a card to buy';
    return 'Select Cards';
  }
  return 'Make Selection';
}

// Register this handler with the registry
inputHandlerRegistry.register('cardSelection', CardSelectionHandler);
