import { nb } from './nb';

/**
 * A framed window in the spirit of two parallel Windows-95 windows on the
 * home screen: black title-bar plate with pixel font, hard border/shadow.
 */
export const Win95Window = ({
  title,
  titleBarRight,
  children,
  style,
}: {
  title: string;
  titleBarRight?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) => (
  <div
    style={{
      backgroundColor: nb.cardBg,
      border: nb.border,
      boxShadow: nb.shadowMd,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      ...style,
    }}
  >
    {/* Title bar */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        backgroundColor: '#000',
        color: '#fff',
        padding: '10px 14px',
        borderBottom: nb.border,
      }}
    >
      <span
        style={{
          fontFamily: nb.pixelFont,
          fontSize: '11px',
          lineHeight: 1.6,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </span>
      {titleBarRight && <span style={{ flexShrink: 0 }}>{titleBarRight}</span>}
    </div>

    {/* Content */}
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 0 }}>
      {children}
    </div>
  </div>
);
