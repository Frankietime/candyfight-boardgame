import { memo, useEffect, useRef, useState } from "react";
import { Ctx } from "boardgame.io";
import { LobbyAPI } from "boardgame.io";
import { District, Location, Card, PlayerGameState, PlayerViewModel } from "@candyfight/shared/types";
import { playerSeatColor } from "@candyfight/shared/constants";
import { LocationComponent } from "../location-component/LocationComponent";
import { marketTierIdFor } from "@candyfight/shared/services/marketServices";
import { locsXPos, locsYPos } from "./constants";
import { DistrictIcon } from "../ui/GameIcon";
import { anchors } from "@candyfight/shared/tutorial/types";

export interface BoardDistrictsLayerProps {
  /** Array of districts to render */
  districts: District[];
  /** Players view model for presence display */
  playersViewModel: PlayerViewModel[];
  /** Current game phase */
  phase: string;
  /** Match data for player names */
  matchData: LobbyAPI.Match;
  /** Current player state */
  player: PlayerGameState;
  /** Currently selected card */
  selectedCard?: Card;
  /** Handler for location selection */
  onLocationSelect: (districtIndex: number, locationIndex: number) => void;
  /** Check if location is disabled */
  isLocationDisabled: (location: Location) => boolean;
  /** Visible market row per tier — each market location shows its own tier. */
  marketRows?: Record<string, Card[]>;
}

/**
 * Component for rendering all districts and their locations on the game board.
 *
 * Extracted from BoardComponent for better separation of concerns
 * and improved memoization opportunities.
 */
export const BoardDistrictsLayer = memo(({
  districts,
  playersViewModel,
  phase,
  matchData,
  player,
  selectedCard,
  onLocationSelect,
  isLocationDisabled,
  marketRows,
}: BoardDistrictsLayerProps) => {
  return (
    <>
      {districts.map((district, dIndex) => (
        <DistrictContainer
          key={`district-${district.id}-${dIndex}`}
          district={district}
          districtIndex={dIndex}
          playersViewModel={playersViewModel}
          phase={phase}
          matchData={matchData}
          player={player}
          selectedCard={selectedCard}
          onLocationSelect={onLocationSelect}
          isLocationDisabled={isLocationDisabled}
          marketRows={marketRows}
        />
      ))}
    </>
  );
});

BoardDistrictsLayer.displayName = "BoardDistrictsLayer";

/**
 * Single district container with its locations
 */
interface DistrictContainerProps {
  district: District;
  districtIndex: number;
  playersViewModel: PlayerViewModel[];
  phase: string;
  matchData: LobbyAPI.Match;
  player: PlayerGameState;
  selectedCard?: Card;
  onLocationSelect: (districtIndex: number, locationIndex: number) => void;
  isLocationDisabled: (location: Location) => boolean;
  marketRows?: Record<string, Card[]>;
}

const TILE_W = Math.round(1280 / 12); // 107px
const TILE_H = Math.round(720 / 12);  //  60px
const HEADER_H = 32;                  // approximate header height (px) — matches .district-header
const HEADER_GAP = 8;                 // gap between header and tile edge
const HEADER_MARGIN = 6;              // horizontal overhang on each side

const DistrictContainer = memo(({
  district,
  districtIndex,
  playersViewModel,
  phase,
  matchData,
  player,
  selectedCard,
  onLocationSelect,
  isLocationDisabled,
  marketRows,
}: DistrictContainerProps) => {
  // Bottom districts (2,3): header below; top districts (0,1): header above
  const isTop = districtIndex >= 2;

  const xs = locsXPos[districtIndex];
  const ys = locsYPos[districtIndex];

  // Horizontal: header spans the exact tile footprint ± margin
  const headerLeft  = Math.min(...xs) - HEADER_MARGIN;
  const headerWidth = Math.max(...xs) + TILE_W - Math.min(...xs) + HEADER_MARGIN * 2;

  // Vertical: sit just outside the tile group with a clear gap
  const headerTop = isTop
    ? Math.max(...ys) + TILE_H + HEADER_GAP          // below bottom tile row
    : Math.min(...ys) - HEADER_H - HEADER_GAP;       // above top tile row

  return (
    <div
      className="district-container absolute"
      style={{
        top: district.y,
        left: district.x,
        width: "340px",
        height: "130px",
      }}
    >
      {/* District Header */}
      <DistrictHeader
        district={district}
        playersViewModel={playersViewModel}
        phase={phase}
        matchData={matchData}
        headerTop={headerTop}
        headerLeft={headerLeft}
        headerWidth={headerWidth}
      />

      {/* District Locations */}
      {district.locations.map((location, locIndex) => (
        <div
          className="location-container"
          key={`location-${districtIndex}-${locIndex}`}
        >
          <LocationComponent
            {...location}
            x={locsXPos[districtIndex][locIndex]}
            y={locsYPos[districtIndex][locIndex]}
            show={true}
            district={district}
            onClick={() => onLocationSelect(districtIndex, locIndex)}
            isDisabled={isLocationDisabled(location)}
            selectedCard={selectedCard}
            player={player}
            marketCards={marketRows?.[marketTierIdFor(location)]}
            tutorAnchorId={anchors.location(districtIndex, locIndex)}
          />
        </div>
      ))}
    </div>
  );
});

DistrictContainer.displayName = "DistrictContainer";

/**
 * District header showing name and presence/winner
 */
interface DistrictHeaderProps {
  district: District;
  playersViewModel: PlayerViewModel[];
  phase: string;
  matchData: LobbyAPI.Match;
  headerTop: number;
  headerLeft: number;
  headerWidth: number;
}

const DistrictHeader = memo(({
  district,
  playersViewModel,
  phase,
  matchData,
  headerTop,
  headerLeft,
  headerWidth,
}: DistrictHeaderProps) => {
  const isCombatPhase = phase === "combatPhase";

  return (
    <div
      data-tutor-id={anchors.district(district.id)}
      className={`district-header district-header--${district.id.toLowerCase()}`}
      style={{ top: headerTop, left: headerLeft, width: headerWidth }}
    >
      <DistrictIcon districtId={district.id} size="md" />
      <span className="district-header-name">{district.name}</span>
      <span className="district-header-separator">|</span>
      {!isCombatPhase && district.presence ? (
        <PresenceDisplay
          presence={district.presence}
          playersViewModel={playersViewModel}
        />
      ) : (
        <WinnerDisplay
          winnerId={district.combatWinnerId}
          matchData={matchData}
        />
      )}
    </div>
  );
});

DistrictHeader.displayName = "DistrictHeader";

/**
 * Display player presence in a district during main phase
 */
interface PresenceDisplayProps {
  presence: Record<string, { playerID: string; amount: number }>;
  playersViewModel: PlayerViewModel[];
}

const PresenceDisplay = memo(({ presence, playersViewModel }: PresenceDisplayProps) => (
  <span className="inline-flex items-center gap-2">
    {playersViewModel
      .map(player => ({ id: player.id, amount: presence[player.id]?.amount ?? 0 }))
      .filter(p => p.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .map(p => (
        <PresenceCounter
          key={`presence-${p.id}`}
          playerID={p.id}
          amount={p.amount}
        />
      ))}
  </span>
));

PresenceDisplay.displayName = "PresenceDisplay";

/**
 * A single player's presence number, in their seat color. Pops on mount
 * (presence gained from zero) and whenever the amount changes.
 */
const PresenceCounter = ({ playerID, amount }: { playerID: string; amount: number }) => {
  const [flashing, setFlashing] = useState(true);
  const prevAmount = useRef(amount);

  useEffect(() => {
    if (prevAmount.current !== amount) {
      prevAmount.current = amount;
      setFlashing(true);
    }
  }, [amount]);

  return (
    <span
      className={`presence-counter${flashing ? " presence-flash" : ""}`}
      style={{ color: playerSeatColor(playerID) }}
      onAnimationEnd={() => setFlashing(false)}
    >
      {amount}
    </span>
  );
};

/**
 * Display district winner during combat phase
 */
interface WinnerDisplayProps {
  winnerId?: string;
  matchData: LobbyAPI.Match;
}

const WinnerDisplay = memo(({ winnerId, matchData }: WinnerDisplayProps) => (
  <span
    style={{
      fontWeight: 600,
      display: "inline",
      color: "#fff", // readable on the header's black plate
    }}
  >
    Winner:{" "}
    <span
      style={{
        color: winnerId ? (playerSeatColor(winnerId)) : "#fff",
      }}
    >
      {" "}
      {winnerId ? matchData.players[parseInt(winnerId)]?.name : " - "}
    </span>
  </span>
));

WinnerDisplay.displayName = "WinnerDisplay";
