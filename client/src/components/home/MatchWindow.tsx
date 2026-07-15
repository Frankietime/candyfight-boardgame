import { useEffect } from 'react';
import { useAppStore } from '../../store';
import { useLobbyStore } from '../lobby-component/store';
import { useLobbyServices } from '../../services/lobbyServices';
import { BACKEND_URL } from '../../config';
import { getRandomPlayerName } from '@candyfight/shared/services/moves/playerServices';
import { PLAYER_SEAT_COLORS } from '@candyfight/shared/constants';
import { useT } from '../../i18n/useT';
import { Win95Window } from '../ui/Win95Window';
import { nb, card, inputStyle, sectionTitle, BrutalButton } from '../ui/nb';
import { NewMatchPanel } from './NewMatchPanel';

/**
 * Right home window: profile + the Open Matches box. Match creation lives
 * INSIDE Open Matches as a full-width button that unfolds into the inline
 * config panel (NewMatchPanel) — no modal.
 */
export const MatchWindow = () => {
  const t = useT();
  const { joinMatch, listMatches } = useLobbyServices();
  const { playerState, setPlayerState } = useAppStore();
  const { matchList, setMatchList } = useLobbyStore();

  useEffect(() => {
    listMatches().then((data) => setMatchList(data));
    const id = setInterval(() => listMatches().then((data) => setMatchList(data)), 500);
    return () => clearInterval(id);
  }, []);

  const onJoinMatch = async (matchID: string) => {
    const { playerCredentials, playerID } = await joinMatch(matchID, {
      playerName: useAppStore.getState().playerState.name,
    });
    useAppStore.getState().setPlayerState({
      ...useAppStore.getState().playerState,
      matchID,
      playerID,
      playerCredentials,
    });
  };

  const onRemoveMatch = async (matchID: string) => {
    await fetch(`${BACKEND_URL}/admin/matches/${matchID}`, { method: 'DELETE' });
  };

  return (
    <Win95Window title="⚔ BATTLE STATION">
      <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.8fr', gap: '20px', alignItems: 'start' }}>
        {/* LEFT COLUMN — profile */}
        <div style={card}>
          <h2 style={sectionTitle}>Your Name</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={playerState.name}
              onChange={(e) => setPlayerState({ ...playerState, name: e.target.value })}
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Enter your name…"
            />
            <BrutalButton
              onClick={() => setPlayerState({ ...playerState, name: getRandomPlayerName() })}
              style={{ backgroundColor: nb.accent, padding: '8px 12px' }}
            >
              ⚄
            </BrutalButton>
          </div>
        </div>

        {/* RIGHT COLUMN — open matches + inline match creation */}
        <div style={card}>
          <h2 style={{ ...sectionTitle, marginBottom: '16px' }}>Open Matches</h2>

          {/* Full-width create button → unfolds into the config panel */}
          <div style={{ marginBottom: '16px' }}>
            <NewMatchPanel />
          </div>

          {matchList && matchList.matches.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {matchList.matches.map((match) => {
                const filled = match.players.filter((p) => p.name);
                const empty = match.players.filter((p) => !p.name).length;
                const isFull = empty === 0;

                return (
                  <div
                    key={match.matchID}
                    style={{
                      border: nb.border,
                      boxShadow: '3px 3px 0px 0px #000',
                      padding: '14px',
                      backgroundColor: '#fafafa',
                    }}
                  >
                    {/* Header row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '2px' }}>
                          {match.setupData?.name ?? 'Unnamed Match'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#555' }}>
                          by {match.setupData?.playerName ?? '—'}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          border: nb.border,
                          backgroundColor: isFull ? '#fecaca' : '#dcfce7',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isFull ? 'FULL' : `${filled.length} / ${match.players.length}`}
                      </span>
                    </div>

                    {/* Game config */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      {[
                        { label: '🕹️', value: match.setupData?.mod?.name ?? 'Base' },
                        { label: '🍬', value: match.setupData?.initialCandy },
                        { label: '💰', value: match.setupData?.initialLoot },
                        { label: '⭐', value: `${match.setupData?.victoryPoints ?? '?'} VP` },
                      ].map(({ label, value }) => (
                        <span
                          key={label}
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 7px',
                            border: '1.5px solid #ccc',
                            backgroundColor: '#f5f5f5',
                            color: '#444',
                          }}
                        >
                          {label} {value ?? '?'}
                        </span>
                      ))}
                    </div>

                    {/* Player seats */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      {match.players.map((p, i) => (
                        <span
                          key={i}
                          title={p.name ?? 'Empty'}
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            border: `2px solid ${p.name ? PLAYER_SEAT_COLORS[i] : '#ccc'}`,
                            backgroundColor: p.name ? `${PLAYER_SEAT_COLORS[i]}22` : '#f5f5f5',
                            color: p.name ? '#000' : '#aaa',
                            maxWidth: '90px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.name ?? '—'}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <BrutalButton
                        onClick={() => onJoinMatch(match.matchID)}
                        disabled={isFull}
                        style={{ flex: 1, justifyContent: 'center', backgroundColor: isFull ? '#f5f5f5' : '#000', color: isFull ? '#aaa' : '#fff' }}
                      >
                        Join
                      </BrutalButton>
                      <BrutalButton
                        onClick={() => onRemoveMatch(match.matchID)}
                        style={{ backgroundColor: '#fecaca', color: '#000' }}
                      >
                        ✕
                      </BrutalButton>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                padding: '32px',
                textAlign: 'center',
                border: '2px dashed #aaa',
                color: '#aaa',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {t('lobby.noMatches')}
            </div>
          )}
        </div>
      </div>
    </Win95Window>
  );
};
