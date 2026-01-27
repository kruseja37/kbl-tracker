import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GameSetupModal from '../components/GameSetupModal';

/**
 * MainMenu - Super Mega Baseball 4 Inspired Design
 * Bold red/white/blue palette, italic sporty typography,
 * strong drop shadows, clean modern-retro aesthetic
 */

interface NavItem {
  path: string;
  label: string;
  sublabel: string;
  accent?: 'red' | 'blue' | 'gold';
}

const seasonItems: NavItem[] = [
  { path: '/season', label: 'DASHBOARD', sublabel: 'Season Overview', accent: 'blue' },
  { path: '/schedule', label: 'SCHEDULE', sublabel: 'View Games', accent: 'blue' },
  { path: '/roster', label: 'ROSTER', sublabel: 'Manage Players', accent: 'blue' },
  { path: '/leaders', label: 'LEADERS', sublabel: 'League Stats', accent: 'gold' },
];

const offseasonItems: NavItem[] = [
  { path: '/offseason', label: 'OFFSEASON', sublabel: 'Between Seasons', accent: 'red' },
  { path: '/offseason/free-agency', label: 'FREE AGENCY', sublabel: 'Sign Players', accent: 'red' },
  { path: '/offseason/draft', label: 'DRAFT', sublabel: 'Pick Prospects', accent: 'red' },
  { path: '/offseason/trades', label: 'TRADES', sublabel: 'Make Deals', accent: 'red' },
];

const extraItems: NavItem[] = [
  { path: '/league-builder', label: 'NEW LEAGUE', sublabel: 'Start Fresh', accent: 'gold' },
  { path: '/awards', label: 'AWARDS', sublabel: 'Ceremonies', accent: 'gold' },
  { path: '/museum', label: 'MUSEUM', sublabel: 'Hall of Fame', accent: 'gold' },
];

// SMB4-inspired color palette
const colors = {
  // Primary colors
  red: '#e31837',
  redDark: '#b8132c',
  redLight: '#ff3050',
  blue: '#1e4d8c',
  blueDark: '#143660',
  blueLight: '#2a6bc4',
  // Accent
  gold: '#f4b942',
  goldDark: '#d9a030',
  // Neutrals
  white: '#ffffff',
  offWhite: '#f5f5f5',
  gray: '#8a9199',
  grayDark: '#4a5568',
  navy: '#1a2332',
  navyDark: '#0f1620',
  // Field
  grassGreen: '#3d8b40',
  grassDark: '#2d6830',
  dirt: '#8b6040',
};

export default function MainMenu() {
  const navigate = useNavigate();
  const [showGameSetup, setShowGameSetup] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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

  const getAccentColors = (accent: 'red' | 'blue' | 'gold' = 'blue') => {
    switch (accent) {
      case 'red':
        return { bg: colors.red, hover: colors.redLight, dark: colors.redDark };
      case 'gold':
        return { bg: colors.gold, hover: '#ffc94d', dark: colors.goldDark };
      default:
        return { bg: colors.blue, hover: colors.blueLight, dark: colors.blueDark };
    }
  };

  // SMB4 style card component
  const MenuCard = ({
    item,
    isButton = false,
    onClick,
    isPrimary = false,
  }: {
    item: NavItem;
    isButton?: boolean;
    onClick?: () => void;
    isPrimary?: boolean;
  }) => {
    const isHovered = hoveredItem === item.path;
    const accentColors = getAccentColors(item.accent);

    const content = (
      <div
        style={{
          ...styles.card,
          ...(isPrimary ? styles.cardPrimary : {}),
          transform: isHovered ? 'translateY(-2px) scale(1.01)' : 'none',
        }}
        onMouseEnter={() => setHoveredItem(item.path)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        {/* Main card body */}
        <div style={{
          ...styles.cardInner,
          background: isPrimary
            ? `linear-gradient(135deg, ${colors.red} 0%, ${colors.redDark} 100%)`
            : `linear-gradient(135deg, ${colors.navy} 0%, ${colors.navyDark} 100%)`,
          borderLeft: isPrimary ? 'none' : `4px solid ${accentColors.bg}`,
        }}>
          {/* Accent stripe */}
          {isPrimary && (
            <div style={styles.accentStripe} />
          )}

          <div style={styles.cardContent}>
            <div style={styles.cardTextGroup}>
              <span style={{
                ...styles.cardLabel,
                ...(isPrimary ? styles.cardLabelPrimary : {}),
              }}>
                {item.label}
              </span>
              <span style={{
                ...styles.cardSublabel,
                ...(isPrimary ? styles.cardSublabelPrimary : {}),
              }}>
                {item.sublabel}
              </span>
            </div>

            <div style={{
              ...styles.cardArrow,
              opacity: isHovered ? 1 : 0.5,
              transform: isHovered ? 'translateX(4px)' : 'none',
            }}>
              ▶
            </div>
          </div>
        </div>

        {/* Drop shadow layer */}
        <div style={{
          ...styles.cardShadow,
          opacity: isHovered ? 0.4 : 0.2,
        }} />
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

  return (
    <div style={styles.container}>
      {/* Stadium background */}
      <div style={styles.stadiumBg}>
        {/* Sky gradient */}
        <div style={styles.sky} />
        {/* Crowd/stands hint */}
        <div style={styles.stands} />
        {/* Field */}
        <div style={styles.field} />
        {/* Dirt infield */}
        <div style={styles.infield} />
      </div>

      {/* Subtle noise texture */}
      <div style={styles.noiseOverlay} />

      {/* Main content */}
      <div style={styles.content}>

        {/* Logo / Title */}
        <div style={styles.logoContainer}>
          <div style={styles.logoInner}>
            {/* SUPER MEGA style top text */}
            <div style={styles.logoTop}>
              <span style={styles.logoSuper}>KRUSE</span>
              <span style={styles.logoMega}>BASEBALL</span>
            </div>
            {/* BASEBALL 4 style main text */}
            <div style={styles.logoMain}>
              <span style={styles.logoBaseball}>LEAGUE</span>
              <div style={styles.logoNumberBox}>
                <span style={styles.logoNumber}>⚾</span>
              </div>
            </div>
            {/* Tagline */}
            <div style={styles.logoTagline}>STAT TRACKER</div>
          </div>
        </div>

        {/* Menu sections */}
        <div style={styles.menuContainer}>

          {/* NEW GAME - Primary CTA */}
          <div style={styles.primarySection}>
            <MenuCard
              item={{ path: '/new-game', label: 'NEW GAME', sublabel: 'Start Tracking a Match', accent: 'red' }}
              isButton
              isPrimary
              onClick={() => setShowGameSetup(true)}
            />
          </div>

          {/* Two-column layout for sections */}
          <div style={styles.sectionsGrid}>

            {/* Left column - Season */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>SEASON</span>
                <div style={styles.sectionLine} />
              </div>
              <div style={styles.sectionCards}>
                {seasonItems.map(item => (
                  <MenuCard key={item.path} item={item} />
                ))}
              </div>
            </div>

            {/* Right column - Offseason */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>OFFSEASON</span>
                <div style={{...styles.sectionLine, background: colors.red}} />
              </div>
              <div style={styles.sectionCards}>
                {offseasonItems.map(item => (
                  <MenuCard key={item.path} item={item} />
                ))}
              </div>
            </div>

          </div>

          {/* Extras row */}
          <div style={styles.extrasSection}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionTitle}>EXTRAS</span>
              <div style={{...styles.sectionLine, background: colors.gold}} />
            </div>
            <div style={styles.extrasGrid}>
              {extraItems.map(item => (
                <MenuCard key={item.path} item={item} />
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span style={styles.footerText}>SELECT AN OPTION TO CONTINUE</span>
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
// STYLES - SMB4 Retro-Modern Aesthetic
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: '"Segoe UI", "Roboto", "Arial Black", sans-serif',
    background: colors.navyDark,
  },

  // Stadium background layers
  stadiumBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    background: `linear-gradient(180deg,
      #87CEEB 0%,
      #b8d4e8 60%,
      #d4e4f0 100%
    )`,
  },
  stands: {
    position: 'absolute',
    top: '25%',
    left: 0,
    right: 0,
    height: '25%',
    background: `linear-gradient(180deg,
      ${colors.grayDark} 0%,
      ${colors.navy} 100%
    )`,
    opacity: 0.6,
  },
  field: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(180deg,
      ${colors.grassGreen} 0%,
      ${colors.grassDark} 100%
    )`,
  },
  infield: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '80%',
    height: '50%',
    transform: 'translateX(-50%)',
    background: `radial-gradient(ellipse at center top,
      ${colors.dirt} 0%,
      transparent 60%
    )`,
    opacity: 0.4,
  },

  noiseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.03,
    background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    pointerEvents: 'none',
  },

  content: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px',
    minHeight: '100vh',
  },

  // Logo styles - SMB4 inspired
  logoContainer: {
    marginBottom: '32px',
  },
  logoInner: {
    textAlign: 'center',
  },
  logoTop: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '-4px',
  },
  logoSuper: {
    fontSize: '1.1rem',
    fontWeight: 800,
    fontStyle: 'italic',
    color: colors.white,
    textShadow: `2px 2px 0 ${colors.navyDark}`,
    letterSpacing: '2px',
  },
  logoMega: {
    fontSize: '1.1rem',
    fontWeight: 800,
    fontStyle: 'italic',
    color: colors.white,
    textShadow: `2px 2px 0 ${colors.navyDark}`,
    letterSpacing: '2px',
  },
  logoMain: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  logoBaseball: {
    fontSize: '3rem',
    fontWeight: 900,
    fontStyle: 'italic',
    color: colors.white,
    textShadow: `
      3px 3px 0 ${colors.red},
      6px 6px 0 ${colors.navyDark}
    `,
    letterSpacing: '-1px',
  },
  logoNumberBox: {
    background: colors.red,
    padding: '4px 12px',
    transform: 'skewX(-8deg)',
    boxShadow: `4px 4px 0 ${colors.navyDark}`,
  },
  logoNumber: {
    fontSize: '2.5rem',
    display: 'block',
    transform: 'skewX(8deg)',
  },
  logoTagline: {
    fontSize: '0.9rem',
    fontWeight: 700,
    fontStyle: 'italic',
    color: colors.gold,
    textShadow: `1px 1px 0 ${colors.navyDark}`,
    letterSpacing: '4px',
    marginTop: '4px',
  },

  // Menu container
  menuContainer: {
    width: '100%',
    maxWidth: '800px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },

  primarySection: {
    marginBottom: '8px',
  },

  sectionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
  },

  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  sectionTitle: {
    fontSize: '0.85rem',
    fontWeight: 800,
    fontStyle: 'italic',
    color: colors.white,
    textShadow: `1px 1px 0 ${colors.navyDark}`,
    letterSpacing: '2px',
    whiteSpace: 'nowrap',
  },
  sectionLine: {
    flex: 1,
    height: '3px',
    background: colors.blue,
    borderRadius: '2px',
  },

  sectionCards: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },

  extrasSection: {
    marginTop: '8px',
  },
  extrasGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },

  // Card styles
  card: {
    position: 'relative',
    cursor: 'pointer',
    transition: 'transform 0.15s ease',
  },
  cardPrimary: {
    // handled inline
  },
  cardInner: {
    position: 'relative',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  accentStripe: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '40%',
    height: '100%',
    background: `linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 100%)`,
  },
  cardContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    position: 'relative',
    zIndex: 1,
  },
  cardTextGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  cardLabel: {
    fontSize: '0.9rem',
    fontWeight: 800,
    fontStyle: 'italic',
    color: colors.white,
    letterSpacing: '1px',
    textShadow: '1px 1px 0 rgba(0,0,0,0.3)',
  },
  cardLabelPrimary: {
    fontSize: '1.3rem',
  },
  cardSublabel: {
    fontSize: '0.65rem',
    fontWeight: 500,
    color: colors.gray,
    letterSpacing: '0.5px',
  },
  cardSublabelPrimary: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.75rem',
  },
  cardArrow: {
    fontSize: '0.8rem',
    color: colors.white,
    transition: 'all 0.15s ease',
  },
  cardShadow: {
    position: 'absolute',
    top: '4px',
    left: '4px',
    right: '-4px',
    bottom: '-4px',
    background: colors.navyDark,
    borderRadius: '4px',
    zIndex: -1,
    transition: 'opacity 0.15s ease',
  },

  // Footer
  footer: {
    marginTop: 'auto',
    paddingTop: '32px',
  },
  footerText: {
    fontSize: '0.7rem',
    fontWeight: 600,
    fontStyle: 'italic',
    color: colors.gray,
    letterSpacing: '2px',
    textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
  },

  // Reset styles
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

// Add responsive styles via media query
const mediaStyles = document.createElement('style');
mediaStyles.textContent = `
  @media (max-width: 640px) {
    .smb4-sections-grid {
      grid-template-columns: 1fr !important;
    }
    .smb4-extras-grid {
      grid-template-columns: 1fr !important;
    }
  }
`;
if (!document.head.querySelector('style[data-smb4-menu]')) {
  mediaStyles.setAttribute('data-smb4-menu', 'true');
  document.head.appendChild(mediaStyles);
}
