import { memo } from "react";
import { Table } from "@radix-ui/themes";
import { playerSeatColor } from "@candyfight/shared/constants";
import { LobbyAPI } from "boardgame.io";
import { District, PlayerGameState, PlayerPresence } from "@candyfight/shared/types";

// Alias for ranking entries
type PlayerRanking = PlayerGameState;

/**
 * End Game Ranking Table - Shows final player rankings
 */
export interface EndGameRankingProps {
  ranking: PlayerRanking[];
  matchData: LobbyAPI.Match;
}

export const EndGameRankingTable = memo(({ ranking, matchData }: EndGameRankingProps) => (
  <Table.Root size="1">
    <Table.Header>
      <Table.Row>
        <Table.ColumnHeaderCell>#</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Player</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Victory Points</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Candy</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Loot</Table.ColumnHeaderCell>
      </Table.Row>
    </Table.Header>

    <Table.Body>
      {ranking.map((player, index) => (
        <Table.Row key={`ranking-${player.id}-${index}`}>
          <Table.RowHeaderCell>
            <span className="font-semibold">{index + 1}</span>
          </Table.RowHeaderCell>
          <Table.Cell>
            <PlayerName
              playerId={player.id}
              name={matchData.players[parseInt(player.id)]?.name}
            />
          </Table.Cell>
          <Table.Cell>{player.victoryPoints}</Table.Cell>
          <Table.Cell>{player.candy}</Table.Cell>
          <Table.Cell>{player.loot}</Table.Cell>
        </Table.Row>
      ))}
    </Table.Body>
  </Table.Root>
));

EndGameRankingTable.displayName = "EndGameRankingTable";

/**
 * Combat Phase Results Table - Shows district winners and presence rankings
 */
export interface CombatResultsProps {
  districts: District[];
  matchData: LobbyAPI.Match;
}

/** A district is tied when players contested it but nobody won it. */
const isTiedDistrict = (district: District): boolean =>
  !district.combatWinnerId &&
  Object.values(district.presence).some(p => p.amount > 0);

export const CombatResultsTable = memo(({ districts, matchData }: CombatResultsProps) => {
  return (
    <Table.Root size="1">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>District</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Ranking</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Winner</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>VP</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>

      <Table.Body>
        {districts.map((district, index) => {
          const tied = isTiedDistrict(district);
          return (
            <Table.Row
              key={`district-result-${district.id}-${index}`}
              style={
                tied
                  ? { opacity: 0.45, filter: "grayscale(1)" }
                  : district.combatWinnerId
                    ? { backgroundColor: "#fef08a" } // won district → accent yellow
                    : undefined
              }
            >
              <Table.RowHeaderCell>
                <span className="font-semibold">
                  {district.id} - {district.name}
                </span>
              </Table.RowHeaderCell>
              <Table.Cell>
                <PresenceRanking
                  presence={district.presence}
                  winnerId={district.combatWinnerId}
                />
              </Table.Cell>
              <Table.Cell>
                <DistrictWinner
                  winnerId={district.combatWinnerId}
                  tied={tied}
                  matchData={matchData}
                />
              </Table.Cell>
              <Table.Cell>
                {district.combatWinnerId ? (
                  <span className="font-semibold" style={{ color: playerSeatColor(district.combatWinnerId) }}>
                    +1
                  </span>
                ) : (
                  <span style={{ color: "#888" }}>-</span>
                )}
              </Table.Cell>
            </Table.Row>
          );
        })}

      </Table.Body>
    </Table.Root>
  );
});

CombatResultsTable.displayName = "CombatResultsTable";

/**
 * Helper component for displaying player name with color
 */
interface PlayerNameProps {
  playerId: string;
  name?: string;
}

const PlayerName = memo(({ playerId, name }: PlayerNameProps) => {
  const playerIndex = parseInt(playerId);
  const color = playerSeatColor(playerIndex);

  return (
    <span
      className="font-semibold italic"
      style={{ color }}
    >
      {name ?? `Player ${playerIndex + 1}`}
    </span>
  );
});

PlayerName.displayName = "PlayerName";

/**
 * Helper component for displaying district winner
 */
interface DistrictWinnerProps {
  winnerId: string | null | undefined;
  matchData: LobbyAPI.Match;
  /** Contested but nobody won — render "Tie" instead of "-" */
  tied?: boolean;
}

const DistrictWinner = memo(({ winnerId, matchData, tied }: DistrictWinnerProps) => {
  if (!winnerId) {
    return <span className="italic" style={{ color: "#888" }}>{tied ? "Tie" : "-"}</span>;
  }

  const playerIndex = parseInt(winnerId);
  const color = playerSeatColor(playerIndex);
  const name = matchData.players[playerIndex]?.name ?? `Player ${playerIndex + 1}`;

  return (
    <span
      className="font-semibold italic"
      style={{ color }}
    >
      {name}
    </span>
  );
});

DistrictWinner.displayName = "DistrictWinner";

/**
 * Helper component for displaying presence ranking in a district
 */
interface PresenceRankingProps {
  presence: Record<string, PlayerPresence>;
  /** Winner's presence number gets a glow in their seat color */
  winnerId?: string | null;
}

const PresenceRanking = memo(({ presence, winnerId }: PresenceRankingProps) => {
  // Sort by amount descending
  const sortedPresence = Object.keys(presence)
    .map(k => presence[k])
    .sort((a, b) => b.amount - a.amount);

  return (
    <>
      {sortedPresence.map((p, index, array) => {
        const color = playerSeatColor(p.playerID);
        const isLast = index === array.length - 1;
        const isWinner = winnerId != null && p.playerID === winnerId;

        return (
          <span key={`presence-${p.playerID}`}>
            <span
              className={`font-semibold italic${isWinner ? " presence-winner-glow" : ""}`}
              style={{ color, fontSize: isWinner ? "1.7em" : undefined }}
            >
              {p.amount ?? ""}
            </span>
            {!isLast && <span style={{ color: "black" }}> / </span>}
          </span>
        );
      })}
    </>
  );
});

PresenceRanking.displayName = "PresenceRanking";

// Re-export for convenience
export { PlayerName, DistrictWinner, PresenceRanking };
