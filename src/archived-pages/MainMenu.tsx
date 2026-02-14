import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GameSetupModal from '../components/GameSetupModal';

/**
 * MainMenu - 1990s SNES Baseball Game Aesthetic
 * Inspired by Super Baseball Simulator 1.000 (1991)
 * With SMB4 white/blue/red color scheme
 */

interface NavItem {
  path: string;
  label: string;
  sublabel: string;
}

const seasonItems: NavItem[] = [
  { path: '/season', label: 'DASHBOARD', sublabel: 'Season Overview' },
  { path: '/schedule', label: 'SCHEDULE', sublabel: 'View Games' },
  { path: '/roster', label: 'ROSTER', sublabel: 'Manage Players' },
  { path: '/leaders', label: 'LEADERS', sublabel: 'League Stats' },
];

const offseasonItems: NavItem[] = [
  { path: '/offseason', label: 'OFFSEASON', sublabel: 'Between Seasons' },
  { path: '/offseason/free-agency', label: 'FREE AGENCY', sublabel: 'Sign Players' },
  { path: '/offseason/draft', label: 'DRAFT', sublabel: 'Pick Prospects' },
  { path: '/offseason/trades', label: 'TRADES', sublabel: 'Make Deals' },
];

const extraItems: NavItem[] = [
  { path: '/league-builder', label: 'NEW LEAGUE', sublabel: 'Start Fresh' },
  { path: '/awards', label: 'AWARDS', sublabel: 'Ceremonies' },
  { path: '/museum', label: 'MUSEUM', sublabel: 'Hall of Fame' },
];

// SMB4 color palette - white/blue/red
const colors = {
  // Primary blue
  blue: '#1a4b8c',
  blueBright: '#2563eb',
  blueDark: '#0f2d5c',

  // Accent red
  red: '#c41e3a',
  redBright: '#dc2626',
  redDark: '#991b1b',

  // White/cream
  white: '#ffffff',
  cream: '#f5f0e1',

  // Supporting
  gold: '#d4a017',
  navy: '#0a1628',
  charcoal: '#1f2937',
};

export default function MainMenu() {
  const navigate = useNavigate();
  const [showGameSetup, setShowGameSetup] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleGameSetupConfirm = (
    awayTeamId: string,
    homeTeamId: string,
    awayPitcherId?: string,
    homePitcherId?: string
  ) => {
    setShowGameSetup(false);
    let url = `/pregame?away=${awayTeamId}&home=${homeTeamId}`;
    if (awayPitcherId) url += `&awayPitcher=${awayPitcherId}`;
    if (homePitcherId) url += `&homePitcher=${homePitcherId}`;
    navigate(url);
  };

  // SNES-style card with chunky border
  const MenuCard = ({
    item,
    isButton = false,
    onClick,
    isPrimary = false,
    headerColor = colors.blue,
  }: {
    item: NavItem;
    isButton?: boolean;
    onClick?: () => void;
    isPrimary?: boolean;
    headerColor?: string;
  }) => {
    const isHovered = hoveredItem === item.path;

    const content = (
      <div
        style={{
          position: 'relative',
          cursor: 'pointer',
          transform: isHovered ? 'scale(1.02)' : 'none',
          transition: 'transform 0.1s ease',
        }}
        onMouseEnter={() => setHoveredItem(item.path)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        {/* Outer border - chunky retro style */}
        <div style={{
          background: isPrimary ? colors.red : colors.blue,
          padding: '4px',
          borderRadius: '4px',
          boxShadow: isHovered
            ? `6px 6px 0 ${colors.navy}`
            : `4px 4px 0 ${colors.navy}`,
        }}>
          {/* Inner card */}
          <div style={{
            background: colors.cream,
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            {/* Header bar */}
            <div style={{
              background: isPrimary
                ? `linear-gradient(180deg, ${colors.redBright} 0%, ${colors.red} 50%, ${colors.redDark} 100%)`
                : `linear-gradient(180deg, ${colors.blueBright} 0%, ${colors.blue} 50%, ${colors.blueDark} 100%)`,
              padding: isPrimary ? '12px 16px' : '8px 12px',
              borderBottom: `3px solid ${isPrimary ? colors.redDark : colors.blueDark}`,
            }}>
              <div style={{
                fontSize: isPrimary ? '1.4rem' : '1rem',
                fontWeight: 900,
                color: colors.white,
                textShadow: '2px 2px 0 rgba(0,0,0,0.5)',
                fontFamily: '"Press Start 2P", "Courier New", monospace',
                letterSpacing: '1px',
              }}>
                {item.label}
              </div>
            </div>

            {/* Content area */}
            <div style={{
              padding: isPrimary ? '10px 16px' : '6px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: `linear-gradient(180deg, ${colors.cream} 0%, #e8e0c8 100%)`,
            }}>
              <span style={{
                fontSize: isPrimary ? '0.8rem' : '0.65rem',
                color: colors.charcoal,
                fontWeight: 600,
              }}>
                {item.sublabel}
              </span>

              {/* Selection indicator */}
              <div style={{
                fontSize: isPrimary ? '1rem' : '0.8rem',
                color: isPrimary ? colors.red : colors.blue,
                opacity: isHovered ? 1 : 0.4,
                animation: isHovered ? 'blink 0.5s infinite' : 'none',
              }}>
                ▶
              </div>
            </div>
          </div>
        </div>
      </div>
    );

    if (isButton) {
      return (
        <button onClick={onClick} style={styles.buttonReset}>
          {content}
        </button>
      );
    }

    return (
      <Link to={item.path} style={styles.linkReset}>
        {content}
      </Link>
    );
  };

  // Section header in retro style
  const SectionHeader = ({ title, color }: { title: string; color: string }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '12px',
    }}>
      <div style={{
        background: color,
        padding: '6px 16px',
        borderRadius: '2px',
        boxShadow: `3px 3px 0 ${colors.navy}`,
      }}>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 900,
          color: colors.white,
          textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
          fontFamily: '"Press Start 2P", "Courier New", monospace',
          letterSpacing: '2px',
        }}>
          {title}
        </span>
      </div>
      <div style={{
        flex: 1,
        height: '4px',
        background: `repeating-linear-gradient(90deg, ${color} 0px, ${color} 8px, transparent 8px, transparent 12px)`,
      }} />
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Baseball field background */}
      <div style={styles.fieldBg}>
        <div style={styles.fieldStripes} />
        <div style={styles.fieldDirt} />
      </div>

      {/* CRT scanlines overlay */}
      <div style={styles.scanlines} />

      {/* Vignette effect */}
      <div style={styles.vignette} />

      {/* Main content */}
      <div style={styles.content}>

        {/* Logo - SNES title screen style */}
        <div style={styles.logo}>
          {/* Top banner */}
          <div style={styles.logoBanner}>
            <span style={styles.logoSmall}>KRUSE BASEBALL</span>
          </div>

          {/* Main title */}
          <div style={styles.logoMain}>
            <span style={styles.logoText}>LEAGUE</span>
          </div>

          {/* Subtitle bar */}
          <div style={styles.logoSubBar}>
            <span style={styles.logoSub}>STAT TRACKER</span>
          </div>
        </div>

        {/* Menu container */}
        <div style={styles.menuContainer}>

          {/* NEW GAME - Primary CTA */}
          <div style={{ marginBottom: '24px' }}>
            <MenuCard
              item={{ path: '/new-game', label: 'NEW GAME', sublabel: 'Start Tracking a Match' }}
              isButton
              isPrimary
              onClick={() => setShowGameSetup(true)}
            />
          </div>

          {/* Two column layout */}
          <div style={styles.columns}>

            {/* Season column */}
            <div style={styles.column}>
              <SectionHeader title="SEASON" color={colors.blue} />
              <div style={styles.cardList}>
                {seasonItems.map(item => (
                  <MenuCard key={item.path} item={item} />
                ))}
              </div>
            </div>

            {/* Offseason column */}
            <div style={styles.column}>
              <SectionHeader title="OFFSEASON" color={colors.red} />
              <div style={styles.cardList}>
                {offseasonItems.map(item => (
                  <MenuCard key={item.path} item={item} headerColor={colors.red} />
                ))}
              </div>
            </div>

          </div>

          {/* Extras row */}
          <div style={{ marginTop: '24px' }}>
            <SectionHeader title="EXTRAS" color={colors.gold} />
            <div style={styles.extrasRow}>
              {extraItems.map(item => (
                <MenuCard key={item.path} item={item} />
              ))}
            </div>
          </div>

        </div>

        {/* Footer - Controller prompt */}
        <div style={styles.footer}>
          <div style={styles.footerBox}>
            <span style={styles.footerText}>
              ◀ ▶ SELECT &nbsp;&nbsp; ● CONFIRM
            </span>
          </div>
        </div>

      </div>

      <GameSetupModal
        isOpen={showGameSetup}
        onClose={() => setShowGameSetup(false)}
        onConfirm={handleGameSetupConfirm}
      />
    </div>
  );
}

// ============================================
// STYLES
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    background: colors.navy,
  },

  // Baseball field background
  fieldBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: '#2d5a27',
  },
  fieldStripes: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `repeating-linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.03) 0px,
      rgba(255, 255, 255, 0.03) 30px,
      transparent 30px,
      transparent 60px
    )`,
  },
  fieldDirt: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '150%',
    height: '40%',
    background: `radial-gradient(ellipse at center bottom,
      rgba(139, 90, 43, 0.4) 0%,
      transparent 70%
    )`,
  },

  // Subtle CRT scanlines - toned down
  scanlines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `repeating-linear-gradient(
      0deg,
      transparent,
      transparent 3px,
      rgba(0, 0, 0, 0.04) 3px,
      rgba(0, 0, 0, 0.04) 6px
    )`,
    pointerEvents: 'none',
    zIndex: 100,
  },

  // Subtle vignette - toned down
  vignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.3) 100%)`,
    pointerEvents: 'none',
    zIndex: 50,
  },

  content: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 20px',
    minHeight: '100vh',
  },

  // Logo - SNES style
  logo: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  logoBanner: {
    display: 'inline-block',
    background: colors.blue,
    padding: '8px 24px',
    marginBottom: '-4px',
    borderRadius: '4px 4px 0 0',
    boxShadow: `3px 0 0 ${colors.blueDark}`,
  },
  logoSmall: {
    fontSize: '0.8rem',
    fontWeight: 900,
    color: colors.white,
    textShadow: '2px 2px 0 rgba(0,0,0,0.5)',
    fontFamily: '"Press Start 2P", "Courier New", monospace',
    letterSpacing: '3px',
  },
  logoMain: {
    display: 'inline-block',
    background: colors.white,
    padding: '12px 32px',
    border: `6px solid ${colors.blue}`,
    boxShadow: `6px 6px 0 ${colors.navy}`,
  },
  logoText: {
    fontSize: '2.8rem',
    fontWeight: 900,
    color: colors.blue,
    textShadow: `3px 3px 0 ${colors.red}`,
    fontFamily: '"Press Start 2P", "Courier New", monospace',
    letterSpacing: '4px',
  },
  logoSubBar: {
    display: 'inline-block',
    background: colors.red,
    padding: '6px 20px',
    marginTop: '-4px',
    borderRadius: '0 0 4px 4px',
    boxShadow: `3px 3px 0 ${colors.redDark}`,
  },
  logoSub: {
    fontSize: '0.65rem',
    fontWeight: 700,
    color: colors.white,
    textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
    fontFamily: '"Press Start 2P", "Courier New", monospace',
    letterSpacing: '4px',
  },

  // Menu
  menuContainer: {
    width: '100%',
    maxWidth: '800px',
  },

  columns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
  },

  column: {
    display: 'flex',
    flexDirection: 'column',
  },

  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  extrasRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },

  // Footer
  footer: {
    marginTop: 'auto',
    paddingTop: '24px',
  },
  footerBox: {
    background: colors.navy,
    padding: '10px 24px',
    borderRadius: '4px',
    border: `3px solid ${colors.blue}`,
    boxShadow: `4px 4px 0 rgba(0,0,0,0.5)`,
  },
  footerText: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: colors.cream,
    fontFamily: '"Press Start 2P", "Courier New", monospace',
    letterSpacing: '1px',
  },

  // Resets
  buttonReset: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    font: 'inherit',
  },
  linkReset: {
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
  },
};

// Add pixel font and animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0.3; }
  }

  @media (max-width: 640px) {
    .menu-columns {
      grid-template-columns: 1fr !important;
    }
    .extras-row {
      grid-template-columns: 1fr !important;
    }
  }
`;
if (!document.head.querySelector('style[data-kbl-menu]')) {
  styleSheet.setAttribute('data-kbl-menu', 'true');
  document.head.appendChild(styleSheet);
}
