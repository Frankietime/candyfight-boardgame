import { nb } from '../ui/nb';
import { GameMenuWindow } from '../home/GameMenuWindow';
import { MatchWindow } from '../home/MatchWindow';

/**
 * Home screen: two framed columns like parallel Windows-95 windows.
 * Left — the game menu (RULES / TUTORIAL / LOAD MOD / MOD LAB).
 * Right — match creation and the open-matches list.
 */
export const LobbyComponent = () => (
  <div style={{ height: '100vh', width: '100%', overflow: 'auto', backgroundColor: nb.bg, padding: '40px 24px', fontFamily: nb.font, boxSizing: 'border-box' }}>
    {/* Title row */}
    <div style={{ marginBottom: '32px' }}>
      <h1
        style={{
          fontSize: '28px',
          fontWeight: 900,
          color: '#000',
          letterSpacing: '-0.5px',
          margin: 0,
          fontFamily: nb.pixelFont,
          lineHeight: 1.4,
        }}
      >
        🍬 CANDY FIGHT
      </h1>
    </div>

    {/* The two parallel windows */}
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) 2.6fr', gap: '28px', alignItems: 'start' }}>
      <GameMenuWindow />
      <MatchWindow />
    </div>
  </div>
);
