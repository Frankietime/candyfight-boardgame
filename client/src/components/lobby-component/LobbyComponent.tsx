import { useEffect, useState } from 'react';
import { useAppStore } from '../../store';
import { useLobbyStore } from './store';
import { useLobbyServices } from '../../services/lobbyServices';
import { BACKEND_URL } from '../../config';
import { getRandomPlayerName } from '@candyfight/shared/services/moves/playerServices';
import { generateBattleEvent } from './helper';
import { GameConfigModal } from './GameConfigModal';
import { GameConfig } from '@candyfight/shared/types';

// Neobrutalist design tokens (from ficcionarios)
const nb = {
  bg: '#e0d4fc',
  cardBg: '#ffffff',
  border: '2px solid #000',
  shadowSm: '4px 4px 0px 0px #000',
  shadowMd: '6px 6px 0px 0px #000',
  accent: '#fef08a',
  red: '#ef4444',
  green: '#22c55e',
  font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
};

const playerColors = ['#ef4444', '#22c55e', '#a855f7', '#eab308'];

// Shared style helpers
const card: React.CSSProperties = {
  backgroundColor: nb.cardBg,
  border: nb.border,
  boxShadow: nb.shadowMd,
  padding: '20px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: nb.border,
  boxShadow: nb.shadowSm,
  padding: '8px 12px',
  fontSize: '13px',
  fontFamily: nb.font,
  fontWeight: 500,
  backgroundColor: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

const btnBase: React.CSSProperties = {
  border: nb.border,
  boxShadow: nb.shadowSm,
  padding: '8px 16px',
  fontSize: '12px',
  fontFamily: nb.font,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'transform 0.1s, box-shadow 0.1s',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
};

const BrutalButton = ({
  onClick,
  disabled,
  children,
  style,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) => {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        ...btnBase,
        ...style,
        transform: pressed ? 'translate(4px, 4px)' : undefined,
        boxShadow: pressed ? 'none' : (style?.boxShadow ?? nb.shadowSm),
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
};

export const LobbyComponent = () => {
  const { createMatch, joinMatch, listMatches } = useLobbyServices();
  const { playerState, setPlayerState } = useAppStore();
  const { matchLore, setMatchLore, matchList, setMatchList } = useLobbyStore();
  const [showConfigModal, setShowConfigModal] = useState(false);

  useEffect(() => {
    listMatches().then((data) => setMatchList(data));
    const id = setInterval(() => listMatches().then((data) => setMatchList(data)), 500);
    return () => clearInterval(id);
  }, []);

  const onCreateMatch = async (config: GameConfig) => {
    setShowConfigModal(false);
    await createMatch(config.numPlayers, {
      name: useLobbyStore.getState().matchLore.title,
      playerName: useAppStore.getState().playerState.name,
      initialCandy: config.initialCandy,
      initialLoot: config.initialLoot,
      victoryPoints: config.victoryPoints,
    });
  };

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
    <>
    <div style={{ height: '100vh', overflow: 'auto', backgroundColor: nb.bg, padding: '40px 24px', fontFamily: nb.font, boxSizing: 'border-box' }}>
      <div>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 900,
              color: '#000',
              letterSpacing: '-0.5px',
              margin: 0,
              fontFamily: "'Press Start 2P', cursive",
              lineHeight: 1.4,
            }}
          >
            🍬 CANDY FIGHT
          </h1>
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...btnBase,
              backgroundColor: '#fff',
              boxShadow: nb.shadowSm,
              textDecoration: 'none',
              color: '#000',
              fontSize: '12px',
            }}
          >
            📖 DOCS
          </a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '28px', alignItems: 'start' }}>

          {/* LEFT PANEL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Profile card */}
            <div style={card}>
              <h2 style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Your Name
              </h2>
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

            {/* Create match card */}
            <div style={card}>
              <h2 style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
                Create Match
              </h2>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  value={matchLore.title}
                  onChange={(e) => setMatchLore({ ...matchLore, title: e.target.value })}
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="Match name…"
                />
                <BrutalButton
                  onClick={() => setMatchLore(generateBattleEvent())}
                  style={{ backgroundColor: '#fff', whiteSpace: 'nowrap', padding: '8px 12px' }}
                >
                  ⚡
                </BrutalButton>
              </div>

              <BrutalButton
                onClick={() => setShowConfigModal(true)}
                style={{ width: '100%', justifyContent: 'center', backgroundColor: '#000', color: '#fff', boxShadow: nb.shadowMd }}
              >
                ▶ Configure &amp; Create Match
              </BrutalButton>
            </div>
          </div>

          {/* RIGHT PANEL — match list */}
          <div style={card}>
            <h2 style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>
              Open Matches
            </h2>

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
                              border: `2px solid ${p.name ? playerColors[i] : '#ccc'}`,
                              backgroundColor: p.name ? `${playerColors[i]}22` : '#f5f5f5',
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
                No open matches yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {showConfigModal && (
      <GameConfigModal
        onConfirm={onCreateMatch}
        onCancel={() => setShowConfigModal(false)}
      />
    )}
    </>
  );
};
