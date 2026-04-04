import { memo } from "react";
import { LobbyAPI } from "boardgame.io";
import { PlayerGameState } from "@candyfight/shared/types";
import { PhaseDialog } from "../../ui/GameDialog";
import { EndGameRankingTable } from "../../ui/PlayerRankingTable";

export interface EndGameDialogProps {
  /** Whether the dialog is open (true when phase is "endGamePhase") */
  open: boolean;
  /** Final player rankings */
  ranking: PlayerGameState[];
  /** Match data for player names */
  matchData: LobbyAPI.Match;
  /** Handler for leaving the match */
  onLeaveMatch: () => void;
}

/**
 * Dialog shown at the end of the game displaying final rankings.
 *
 * Extracted from BoardComponent for better separation of concerns.
 */
export const EndGameDialog = memo(({
  open,
  ranking,
  matchData,
  onLeaveMatch,
}: EndGameDialogProps) => {
  const winner = ranking[0];
  const winnerName = winner
    ? (matchData.players[parseInt(winner.id)]?.name ?? `Player ${parseInt(winner.id) + 1}`)
    : undefined;

  return (
    <PhaseDialog
      open={open}
      title={winnerName ? (
        <span className="victory-title">{`VICTORY - ${winnerName}`}</span>
      ) : undefined}
      actionLabel="Go to Lobby"
      onAction={onLeaveMatch}
      actionColor="red"
      top="2%"
    >
      <EndGameRankingTable
        ranking={ranking}
        matchData={matchData}
      />
    </PhaseDialog>
  );
});

EndGameDialog.displayName = "EndGameDialog";
