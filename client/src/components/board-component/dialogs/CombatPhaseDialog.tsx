import { memo } from "react";
import { LobbyAPI } from "boardgame.io";
import { District } from "@candyfight/shared/types";
import { PhaseDialog } from "../../ui/GameDialog";
import { CombatResultsTable } from "../../ui/PlayerRankingTable";

export interface CombatPhaseDialogProps {
  /** Whether the dialog is open (true when phase is "combatPhase") */
  open: boolean;
  /** Districts with combat results */
  districts: District[];
  /** Match data for player names */
  matchData: LobbyAPI.Match;
  /** Whether the round is currently ending (waiting for other players) */
  isRoundEnding: boolean;
  /** Handler for ending the round */
  onEndRound: () => void;
}

/**
 * Dialog shown during combat phase displaying district winners and rankings.
 *
 * Extracted from BoardComponent for better separation of concerns.
 */
export const CombatPhaseDialog = memo(({
  open,
  districts,
  matchData,
  isRoundEnding,
  onEndRound,
}: CombatPhaseDialogProps) => {
  return (
    <PhaseDialog
      open={open}
      actionLabel="End Round"
      onAction={onEndRound}
      actionColor="red"
      isActionDisabled={isRoundEnding}
      waitingMessage="Waiting for other players..."
    >
      <CombatResultsTable
        districts={districts}
        matchData={matchData}
      />
    </PhaseDialog>
  );
});

CombatPhaseDialog.displayName = "CombatPhaseDialog";
