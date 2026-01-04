import { memo, useMemo } from "react";
import { Ctx } from "boardgame.io";
import { LobbyAPI } from "boardgame.io";
import { District, Location, Card, PlayerGameState, PlayerViewModel } from "@candyfight/shared/types";
import { PlayerColorsEnum } from "@candyfight/shared/enums";
import { LocationComponent } from "../location-component/LocationComponent";
import { locsXPos, locsYPos } from "./constants";

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
}

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
}: DistrictContainerProps) => {
  return (
    <div
      className="district-container absolute"
      style={{
        top: district.y,
        left: district.x,
        width: "fit-content",
        height: "fit-content",
      }}
    >
      {/* District Header */}
      <DistrictHeader
        district={district}
        playersViewModel={playersViewModel}
        phase={phase}
        matchData={matchData}
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
}

const DistrictHeader = memo(({
  district,
  playersViewModel,
  phase,
  matchData,
}: DistrictHeaderProps) => {
  const isCombatPhase = phase === "combatPhase";

  return (
    <div
      className="district-name-container"
      style={{
        top: "-50px",
        position: "relative",
        color: "black",
        fontWeight: 600,
        backgroundColor: "white",
        padding: "10px",
      }}
    >
      <div className="district-name">
        {district.id} - {district.name} |{" "}
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
  <>
    {playersViewModel.map(player => (
      <span
        key={`presence-${player.id}`}
        style={{
          fontWeight: 600,
          color: PlayerColorsEnum[parseInt(player.id)] as string,
          display: "inline",
        }}
      >
        {" "}
        {presence[player.id]?.amount ?? " - "}
      </span>
    ))}
  </>
));

PresenceDisplay.displayName = "PresenceDisplay";

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
    }}
  >
    Winner:{" "}
    <span
      style={{
        color: winnerId ? (PlayerColorsEnum[parseInt(winnerId)] as string) : "black",
      }}
    >
      {" "}
      {winnerId ? matchData.players[parseInt(winnerId)]?.name : " - "}
    </span>
  </span>
));

WinnerDisplay.displayName = "WinnerDisplay";
