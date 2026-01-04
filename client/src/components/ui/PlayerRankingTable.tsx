import { memo } from "react";
import { Table } from "@radix-ui/themes";
import { PlayerColorsEnum } from "@candyfight/shared/enums";
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

export const CombatResultsTable = memo(({ districts, matchData }: CombatResultsProps) => (
  <Table.Root size="1">
    <Table.Header>
      <Table.Row>
        <Table.ColumnHeaderCell>District</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Winner</Table.ColumnHeaderCell>
        <Table.ColumnHeaderCell>Ranking</Table.ColumnHeaderCell>
      </Table.Row>
    </Table.Header>

    <Table.Body>
      {districts.map((district, index) => (
        <Table.Row key={`district-result-${district.id}-${index}`}>
          <Table.RowHeaderCell>
            <span className="font-semibold">
              {district.id} - {district.name}
            </span>
          </Table.RowHeaderCell>
          <Table.Cell>
            <DistrictWinner
              winnerId={district.combatWinnerId}
              matchData={matchData}
            />
          </Table.Cell>
          <Table.Cell>
            <PresenceRanking presence={district.presence} />
          </Table.Cell>
        </Table.Row>
      ))}
    </Table.Body>
  </Table.Root>
));

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
  const color = PlayerColorsEnum[playerIndex] as string;

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
}

const DistrictWinner = memo(({ winnerId, matchData }: DistrictWinnerProps) => {
  if (!winnerId) {
    return <span>-</span>;
  }

  const playerIndex = parseInt(winnerId);
  const color = PlayerColorsEnum[playerIndex] as string;
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
}

const PresenceRanking = memo(({ presence }: PresenceRankingProps) => {
  // Sort by amount descending
  const sortedPresence = Object.keys(presence)
    .map(k => presence[k])
    .sort((a, b) => b.amount - a.amount);

  return (
    <>
      {sortedPresence.map((p, index, array) => {
        const color = PlayerColorsEnum[parseInt(p.playerID)] as string;
        const isLast = index === array.length - 1;

        return (
          <span key={`presence-${p.playerID}`}>
            <span
              className="font-semibold italic"
              style={{ color }}
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
