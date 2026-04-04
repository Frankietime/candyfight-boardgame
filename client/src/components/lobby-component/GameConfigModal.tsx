import { useState } from 'react';
import { GameConfig, DEFAULT_GAME_CONFIG } from '@candyfight/shared/types';

const nb = {
  bg: '#e0d4fc',
  border: '2px solid #000',
  shadowSm: '4px 4px 0px 0px #000',
  shadowMd: '6px 6px 0px 0px #000',
  accent: '#fef08a',
  font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
};

const btnBase: React.CSSProperties = {
  border: nb.border,
  boxShadow: nb.shadowSm,
  padding: '8px 16px',
  fontSize: '12px',
  fontFamily: nb.font,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  border: nb.border,
  boxShadow: nb.shadowSm,
  padding: '8px 12px',
  fontSize: '13px',
  fontFamily: nb.font,
  fontWeight: 500,
  backgroundColor: '#fff',
  outline: 'none',
  width: '80px',
  textAlign: 'center' as const,
};

interface GameConfigModalProps {
  onConfirm: (config: GameConfig) => void;
  onCancel: () => void;
}

export const GameConfigModal = ({ onConfirm, onCancel }: GameConfigModalProps) => {
  const [numPlayers, setNumPlayers] = useState(DEFAULT_GAME_CONFIG.numPlayers);
  const [initialCandy, setInitialCandy] = useState(DEFAULT_GAME_CONFIG.initialCandy);
  const [initialLoot, setInitialLoot] = useState(DEFAULT_GAME_CONFIG.initialLoot);
  const [victoryPoints, setVictoryPoints] = useState(DEFAULT_GAME_CONFIG.victoryPoints);

  const handleConfirm = () => {
    onConfirm({ numPlayers, initialCandy, initialLoot, victoryPoints });
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      fontFamily: nb.font,
    }}>
      <div style={{
        backgroundColor: '#fff',
        border: nb.border,
        boxShadow: nb.shadowMd,
        padding: '28px',
        minWidth: '340px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        <h2 style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
          ⚙ Match Configuration
        </h2>

        {/* Number of Players */}
        <div>
          <div style={labelStyle}>Players</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setNumPlayers(n)}
                style={{
                  ...btnBase,
                  padding: '6px 18px',
                  backgroundColor: numPlayers === n ? nb.accent : '#fff',
                  boxShadow: numPlayers === n ? '2px 2px 0px 0px #000' : nb.shadowSm,
                  transform: numPlayers === n ? 'translate(2px, 2px)' : undefined,
                }}
              >
                {n}P
              </button>
            ))}
          </div>
        </div>

        {/* Initial Resources */}
        <div>
          <div style={labelStyle}>Starting Resources</div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600 }}>🍬 Candy</span>
              <input
                type="number"
                min={0}
                max={20}
                value={initialCandy}
                onChange={(e) => setInitialCandy(Math.max(0, parseInt(e.target.value) || 0))}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600 }}>💰 Loot</span>
              <input
                type="number"
                min={0}
                max={20}
                value={initialLoot}
                onChange={(e) => setInitialLoot(Math.max(0, parseInt(e.target.value) || 0))}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Victory Condition */}
        <div>
          <div style={labelStyle}>Victory Points to Win</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {[4, 6, 8, 10].map((vp) => (
              <button
                key={vp}
                onClick={() => setVictoryPoints(vp)}
                style={{
                  ...btnBase,
                  padding: '6px 14px',
                  backgroundColor: victoryPoints === vp ? nb.accent : '#fff',
                  boxShadow: victoryPoints === vp ? '2px 2px 0px 0px #000' : nb.shadowSm,
                  transform: victoryPoints === vp ? 'translate(2px, 2px)' : undefined,
                }}
              >
                {vp}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button
            onClick={onCancel}
            style={{ ...btnBase, backgroundColor: '#fff' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{ ...btnBase, backgroundColor: '#000', color: '#fff', boxShadow: nb.shadowMd }}
          >
            ▶ Create Match ({numPlayers}P)
          </button>
        </div>
      </div>
    </div>
  );
};
