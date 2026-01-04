/**
 * Card Selection Handler
 *
 * UI component for selecting cards from the player's hand.
 * Used for DISCARD, TRASH, and similar actions.
 */

import { useState, useMemo } from "react";
import { Button, Dialog, Flex } from "@radix-ui/themes";
import { Card } from "@candyfight/shared/types";
import { CardSelectionInputSpec, isCardSelectionSpec } from "@candyfight/shared/actions";
import { InputHandlerProps, CardSelectionResult, inputHandlerRegistry } from "../../actions/input-handlers";
import { CardComponent } from "../card-components/CardComponent";

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
  title,
}: CardSelectionHandlerProps) {
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);

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
  }, [cardSpec, player, excludeCardId]);

  // Selection limits
  const effectiveMinCount = minCount ?? cardSpec?.minCount ?? 1;
  const effectiveMaxCount = maxCount ?? cardSpec?.maxCount ?? 1;

  // Handle card click
  const handleCardClick = (card: Card) => {
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

  return (
    <Dialog.Root open={true}>
      <Dialog.Content style={{ height: "300px", maxWidth: "1000px" }}>
        <Dialog.Title>
          <Flex justify="center">{displayTitle}</Flex>
        </Dialog.Title>

        <Flex>
          {sourceCards.map((card, index) => (
            <CardComponent
              key={`select-card-${card.id}-${index}`}
              card={card}
              isSelected={selectedCards.some(c => c.id === card.id)}
              y={120}
              x={20 + index * 105}
              show={true}
              onClick={() => handleCardClick(card)}
              selectionColor="red"
            />
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
    return 'Select Cards';
  }
  return 'Make Selection';
}

// Register this handler with the registry
inputHandlerRegistry.register('cardSelection', CardSelectionHandler);
