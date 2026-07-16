import { useState } from 'react';
import { useAppStore } from '../../store';
import { useT } from '../../i18n/useT';
import { LanguageToggle } from '../../i18n/LanguageToggle';
import { Win95Window } from '../ui/Win95Window';
import { nb } from '../ui/nb';

/**
 * Left home window: the game menu — RULES / TUTORIAL / MOD LAB / DECK LAB,
 * with the ES/EN toggle in the window's title bar. (Cartridge loading lives
 * in the match-config panel inside Open Matches.)
 */
export const GameMenuWindow = () => {
  const t = useT();
  const { setTutorialOpen, setScreen } = useAppStore();

  const entries: { icon: string; label: string; onClick: () => void }[] = [
    { icon: '📖', label: t('menu.rules'), onClick: () => window.open('/docs', '_blank', 'noopener,noreferrer') },
    { icon: '🍬', label: t('menu.tutorial'), onClick: () => setTutorialOpen(true) },
    { icon: '🧪', label: t('menu.modLab'), onClick: () => setScreen('modLab') },
    { icon: '🎴', label: t('menu.deckLab'), onClick: () => setScreen('deckLab') },
  ];

  return (
    <Win95Window title={t('menu.title')} titleBarRight={<LanguageToggle />}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {entries.map(({ icon, label, onClick }) => (
          <MenuEntry key={label} icon={icon} label={label} onClick={onClick} />
        ))}
      </div>
    </Win95Window>
  );
};

const MenuEntry = ({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        border: nb.border,
        boxShadow: hover ? 'none' : nb.shadowSm,
        transform: hover ? 'translate(4px, 4px)' : undefined,
        transition: 'transform 0.1s, box-shadow 0.1s',
        backgroundColor: hover ? nb.accent : '#fff',
        padding: '14px 16px',
        cursor: 'pointer',
        fontFamily: nb.pixelFont,
        fontSize: '11px',
        textTransform: 'uppercase',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      {label}
    </button>
  );
};
