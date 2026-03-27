import { memo } from "react";
import { Tooltip } from "@radix-ui/themes";
import { PlayerGameState, PlayerViewModel, Card } from "@candyfight/shared/types";

export type DisplayVariant = "self" | "enemy";

export interface PlayerResourceDisplayProps {
  /** The player data to display (can be full PlayerGameState or PlayerViewModel) */
  player: PlayerGameState | PlayerViewModel;
  /** Whether this is the current player or an enemy */
  variant: DisplayVariant;
  /** Position styling */
  position?: {
    top?: number | string;
    left?: number | string;
    right?: number | string;
    bottom?: number | string;
  };
  /** Additional CSS class names */
  className?: string;
}

// Type guard to check if player has full data (PlayerGameState) or just view model
function hasFullData(player: PlayerGameState | PlayerViewModel): player is PlayerGameState {
  return 'deck' in player && Array.isArray((player as PlayerGameState).deck);
}

// Helper to format card names for tooltip
function formatCardNames(cards: Card[] | undefined): string {
  if (!cards || cards.length === 0) return "";
  return cards.map(c => c.name).join(" - ");
}

/**
 * Reusable component for displaying player resources.
 * Fixes the bug where enemy stats incorrectly displayed the current player's data.
 *
 * Used in PlayerAreaComponent for both self and enemy resource displays.
 */
export const PlayerResourceDisplay = memo(({
  player,
  variant,
  position,
  className = "",
}: PlayerResourceDisplayProps) => {
  // Build position styles
  const positionStyle: React.CSSProperties = {
    position: "absolute",
    ...(position?.top !== undefined && { top: position.top }),
    ...(position?.left !== undefined && { left: position.left }),
    ...(position?.right !== undefined && { right: position.right }),
    ...(position?.bottom !== undefined && { bottom: position.bottom }),
    ...(variant === "enemy" && { fontSize: "7px" }),
  };

  // Get values - handle both full player state and view model
  const victoryPoints = player.victoryPoints ?? 0;
  const candy = player.candy ?? 0;
  const loot = player.loot ?? 0;

  // These properties are only available in full PlayerGameState
  const deckLength = hasFullData(player) ? player.deck.length : 0;
  const discardPile = hasFullData(player) ? player.discardPile : [];
  const trashPile = hasFullData(player) ? player.trashPile : [];

  const vpClassName = variant === "enemy" ? "text-vp enemy" : "text-vp";

  return (
    <div
      className={`player-resource-container ${className}`}
      style={positionStyle}
    >
      {/* Victory Points */}
      <div className={vpClassName} style={getVpStyle(variant)}>
        {victoryPoints}
      </div>

      {/* Candy */}
      <div>
        Candy
        <hr />
        <div>{candy}</div>
      </div>

      {/* Loot */}
      <div>
        Loot
        <hr />
        <div>{loot}</div>
      </div>

      {/* Deck - only show for full player data */}
      {hasFullData(player) && (
        <div>
          Deck
          <hr />
          <div>{deckLength}</div>
        </div>
      )}

      {/* Discard Pile - only show for full player data */}
      {hasFullData(player) && (
        <Tooltip content={formatCardNames(discardPile) || "Discard Pile"}>
          <div>
            Discard
            <hr />
            <div>{discardPile.length}</div>
          </div>
        </Tooltip>
      )}

      {/* Trash Pile - only show for full player data */}
      {hasFullData(player) && (
        <Tooltip content={formatCardNames(trashPile) || "Trash Pile"}>
          <div>
            Trash
            <hr />
            <div>{trashPile.length}</div>
          </div>
        </Tooltip>
      )}
    </div>
  );
});

PlayerResourceDisplay.displayName = "PlayerResourceDisplay";

// Victory points positioning styles based on variant
function getVpStyle(variant: DisplayVariant): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    position: "relative",
    left: "3px",
    fontSize: "15pt",
  };

  if (variant === "enemy") {
    return {
      ...baseStyle,
      top: "-8px",
    };
  }

  return {
    ...baseStyle,
    top: "-39px",
  };
}

// Preset positions for common layouts
export const RESOURCE_POSITIONS = {
  /** Current player's resource display */
  self: { top: undefined, left: undefined } as const,

  /** Enemy positions by seat index */
  enemy: (seatIndex: number) => ({
    top: seatIndex === 0 || seatIndex === 2 ? 90 : 0,
    left: seatIndex === 0 ? 968 : 260,
  }),
} as const;
