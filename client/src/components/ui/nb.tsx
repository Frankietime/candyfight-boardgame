import { useState } from 'react';

/**
 * Neobrutalist design tokens — single source for every home/lobby/mod-lab
 * surface (previously copy-pasted into LobbyComponent and GameConfigModal).
 */
export const nb = {
  bg: '#e0d4fc',
  cardBg: '#ffffff',
  border: '2px solid #000',
  shadowSm: '4px 4px 0px 0px #000',
  shadowMd: '6px 6px 0px 0px #000',
  accent: '#fef08a',
  red: '#ef4444',
  green: '#22c55e',
  font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
  pixelFont: "'Press Start 2P', cursive",
};

export const card: React.CSSProperties = {
  backgroundColor: nb.cardBg,
  border: nb.border,
  boxShadow: nb.shadowMd,
  padding: '20px',
};

export const inputStyle: React.CSSProperties = {
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

export const btnBase: React.CSSProperties = {
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

export const sectionTitle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 900,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '12px',
};

export const BrutalButton = ({
  onClick,
  disabled,
  children,
  style,
  title,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  title?: string;
}) => {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
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
