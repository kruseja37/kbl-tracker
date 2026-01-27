/**
 * KBL Tracker - Global Theme
 * 1990s SNES Baseball Game Aesthetic with SMB4 color scheme
 *
 * Inspired by Super Baseball Simulator 1.000 (1991)
 * Colors: White/Blue/Red (SMB4 palette)
 */

// ============================================
// COLOR PALETTE
// ============================================

export const colors = {
  // Primary blue
  blue: '#1a4b8c',
  blueBright: '#2563eb',
  blueDark: '#0f2d5c',
  blueLight: '#3b82f6',

  // Accent red
  red: '#c41e3a',
  redBright: '#dc2626',
  redDark: '#991b1b',
  redLight: '#ef4444',

  // White/cream backgrounds
  white: '#ffffff',
  cream: '#f5f0e1',
  creamDark: '#e8e0c8',

  // Gold accent
  gold: '#d4a017',
  goldBright: '#fbbf24',
  goldDark: '#b8860b',

  // Dark backgrounds
  navy: '#0a1628',
  navyLight: '#1a2744',
  charcoal: '#1f2937',
  charcoalLight: '#374151',

  // Greens (for field/positive)
  green: '#2d5a27',
  greenBright: '#22c55e',
  greenDark: '#1a4d1a',

  // Neutrals
  gray: '#6b7280',
  grayLight: '#9ca3af',
  grayDark: '#4b5563',

  // Semantic colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const fonts = {
  // Pixel/retro font for headers
  pixel: '"Press Start 2P", "Courier New", monospace',
  // System font for body text
  body: '"Segoe UI", system-ui, -apple-system, sans-serif',
  // Monospace for stats/numbers
  mono: '"SF Mono", "Monaco", "Inconsolata", monospace',
} as const;

export const fontSizes = {
  xs: '0.65rem',
  sm: '0.75rem',
  base: '0.875rem',
  md: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '2rem',
  '4xl': '2.5rem',
} as const;

// ============================================
// SPACING & SIZING
// ============================================

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
} as const;

export const borderRadius = {
  sm: '2px',
  md: '4px',
  lg: '6px',
  xl: '8px',
} as const;

// ============================================
// SHADOWS (Retro hard shadows)
// ============================================

export const shadows = {
  sm: `2px 2px 0 ${colors.navy}`,
  md: `3px 3px 0 ${colors.navy}`,
  lg: `4px 4px 0 ${colors.navy}`,
  xl: `6px 6px 0 ${colors.navy}`,
  // Colored shadows
  blue: `3px 3px 0 ${colors.blueDark}`,
  red: `3px 3px 0 ${colors.redDark}`,
  gold: `3px 3px 0 ${colors.goldDark}`,
} as const;

// ============================================
// REUSABLE STYLE OBJECTS
// ============================================

export const cardStyles = {
  // Standard card with blue border
  base: {
    background: colors.cream,
    border: `4px solid ${colors.blue}`,
    borderRadius: borderRadius.md,
    boxShadow: shadows.lg,
  } as React.CSSProperties,

  // Primary card (red border)
  primary: {
    background: colors.cream,
    border: `4px solid ${colors.red}`,
    borderRadius: borderRadius.md,
    boxShadow: shadows.lg,
  } as React.CSSProperties,

  // Dark card for contrast sections
  dark: {
    background: colors.navy,
    border: `3px solid ${colors.blue}`,
    borderRadius: borderRadius.md,
    boxShadow: shadows.lg,
  } as React.CSSProperties,
};

export const headerStyles = {
  // Blue gradient header bar
  blue: {
    background: `linear-gradient(180deg, ${colors.blueBright} 0%, ${colors.blue} 50%, ${colors.blueDark} 100%)`,
    borderBottom: `3px solid ${colors.blueDark}`,
    padding: `${spacing.sm} ${spacing.md}`,
  } as React.CSSProperties,

  // Red gradient header bar
  red: {
    background: `linear-gradient(180deg, ${colors.redBright} 0%, ${colors.red} 50%, ${colors.redDark} 100%)`,
    borderBottom: `3px solid ${colors.redDark}`,
    padding: `${spacing.sm} ${spacing.md}`,
  } as React.CSSProperties,

  // Gold gradient header bar
  gold: {
    background: `linear-gradient(180deg, ${colors.goldBright} 0%, ${colors.gold} 50%, ${colors.goldDark} 100%)`,
    borderBottom: `3px solid ${colors.goldDark}`,
    padding: `${spacing.sm} ${spacing.md}`,
  } as React.CSSProperties,
};

export const buttonStyles = {
  // Primary button (blue)
  primary: {
    background: `linear-gradient(180deg, ${colors.blueBright} 0%, ${colors.blue} 50%, ${colors.blueDark} 100%)`,
    color: colors.white,
    border: `3px solid ${colors.blueDark}`,
    borderRadius: borderRadius.md,
    boxShadow: shadows.md,
    padding: `${spacing.sm} ${spacing.lg}`,
    fontFamily: fonts.pixel,
    fontSize: fontSizes.sm,
    fontWeight: 700,
    textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
    cursor: 'pointer',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  } as React.CSSProperties,

  // Secondary button (red)
  secondary: {
    background: `linear-gradient(180deg, ${colors.redBright} 0%, ${colors.red} 50%, ${colors.redDark} 100%)`,
    color: colors.white,
    border: `3px solid ${colors.redDark}`,
    borderRadius: borderRadius.md,
    boxShadow: shadows.md,
    padding: `${spacing.sm} ${spacing.lg}`,
    fontFamily: fonts.pixel,
    fontSize: fontSizes.sm,
    fontWeight: 700,
    textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
    cursor: 'pointer',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  } as React.CSSProperties,

  // Ghost button
  ghost: {
    background: 'transparent',
    color: colors.cream,
    border: `2px solid ${colors.blue}`,
    borderRadius: borderRadius.md,
    padding: `${spacing.sm} ${spacing.lg}`,
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.1s ease',
  } as React.CSSProperties,
};

export const inputStyles = {
  // Standard text input
  base: {
    background: colors.white,
    border: `3px solid ${colors.blue}`,
    borderRadius: borderRadius.md,
    padding: `${spacing.sm} ${spacing.md}`,
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colors.charcoal,
    boxShadow: `inset 2px 2px 0 rgba(0,0,0,0.1)`,
  } as React.CSSProperties,

  // Select dropdown
  select: {
    background: colors.white,
    border: `3px solid ${colors.blue}`,
    borderRadius: borderRadius.md,
    padding: `${spacing.sm} ${spacing.md}`,
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colors.charcoal,
    cursor: 'pointer',
  } as React.CSSProperties,
};

export const textStyles = {
  // Pixel font header
  headerPixel: {
    fontFamily: fonts.pixel,
    fontWeight: 900,
    color: colors.white,
    textShadow: '2px 2px 0 rgba(0,0,0,0.5)',
    letterSpacing: '1px',
  } as React.CSSProperties,

  // Section title
  sectionTitle: {
    fontFamily: fonts.pixel,
    fontSize: fontSizes.sm,
    fontWeight: 700,
    color: colors.white,
    textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
    letterSpacing: '2px',
  } as React.CSSProperties,

  // Body text on dark bg
  bodyLight: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colors.cream,
    lineHeight: 1.5,
  } as React.CSSProperties,

  // Body text on light bg
  bodyDark: {
    fontFamily: fonts.body,
    fontSize: fontSizes.base,
    color: colors.charcoal,
    lineHeight: 1.5,
  } as React.CSSProperties,

  // Stats/numbers
  stat: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.lg,
    fontWeight: 700,
    color: colors.white,
  } as React.CSSProperties,
};

// ============================================
// LAYOUT STYLES
// ============================================

export const layoutStyles = {
  // Page container with field background
  pageContainer: {
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: fonts.body,
    background: colors.navy,
  } as React.CSSProperties,

  // Field background
  fieldBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: colors.green,
  } as React.CSSProperties,

  // Field stripes overlay
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
  } as React.CSSProperties,

  // Subtle scanlines (toned down)
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
  } as React.CSSProperties,

  // Subtle vignette
  vignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.3) 100%)`,
    pointerEvents: 'none',
    zIndex: 50,
  } as React.CSSProperties,

  // Content wrapper
  content: {
    position: 'relative',
    zIndex: 10,
    padding: spacing.xl,
  } as React.CSSProperties,
};

// ============================================
// MODAL STYLES
// ============================================

export const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(10, 22, 40, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  } as React.CSSProperties,

  container: {
    background: colors.cream,
    border: `6px solid ${colors.blue}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.xl,
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'hidden',
  } as React.CSSProperties,

  header: {
    ...headerStyles.blue,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,

  headerTitle: {
    ...textStyles.headerPixel,
    fontSize: fontSizes.md,
  } as React.CSSProperties,

  body: {
    padding: spacing.lg,
    background: `linear-gradient(180deg, ${colors.cream} 0%, ${colors.creamDark} 100%)`,
  } as React.CSSProperties,

  footer: {
    padding: spacing.md,
    background: colors.creamDark,
    borderTop: `3px solid ${colors.blue}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: spacing.md,
  } as React.CSSProperties,
};

// ============================================
// TABLE STYLES
// ============================================

export const tableStyles = {
  container: {
    background: colors.cream,
    border: `4px solid ${colors.blue}`,
    borderRadius: borderRadius.md,
    boxShadow: shadows.lg,
    overflow: 'hidden',
  } as React.CSSProperties,

  header: {
    ...headerStyles.blue,
  } as React.CSSProperties,

  headerCell: {
    fontFamily: fonts.pixel,
    fontSize: fontSizes.xs,
    fontWeight: 700,
    color: colors.white,
    textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
    padding: spacing.sm,
    textAlign: 'left' as const,
  } as React.CSSProperties,

  row: {
    borderBottom: `2px solid ${colors.blue}`,
    background: colors.cream,
  } as React.CSSProperties,

  rowAlt: {
    borderBottom: `2px solid ${colors.blue}`,
    background: colors.creamDark,
  } as React.CSSProperties,

  cell: {
    padding: spacing.sm,
    fontFamily: fonts.body,
    fontSize: fontSizes.sm,
    color: colors.charcoal,
  } as React.CSSProperties,

  cellNumber: {
    padding: spacing.sm,
    fontFamily: fonts.mono,
    fontSize: fontSizes.sm,
    fontWeight: 600,
    color: colors.charcoal,
    textAlign: 'right' as const,
  } as React.CSSProperties,
};

// ============================================
// BADGE STYLES
// ============================================

export const badgeStyles = {
  blue: {
    background: colors.blue,
    color: colors.white,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: borderRadius.sm,
    fontFamily: fonts.pixel,
    fontSize: fontSizes.xs,
    fontWeight: 700,
    textShadow: '1px 1px 0 rgba(0,0,0,0.3)',
    boxShadow: shadows.sm,
  } as React.CSSProperties,

  red: {
    background: colors.red,
    color: colors.white,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: borderRadius.sm,
    fontFamily: fonts.pixel,
    fontSize: fontSizes.xs,
    fontWeight: 700,
    textShadow: '1px 1px 0 rgba(0,0,0,0.3)',
    boxShadow: shadows.sm,
  } as React.CSSProperties,

  gold: {
    background: colors.gold,
    color: colors.navy,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: borderRadius.sm,
    fontFamily: fonts.pixel,
    fontSize: fontSizes.xs,
    fontWeight: 700,
    boxShadow: shadows.sm,
  } as React.CSSProperties,

  success: {
    background: colors.success,
    color: colors.white,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: borderRadius.sm,
    fontSize: fontSizes.xs,
    fontWeight: 700,
  } as React.CSSProperties,

  warning: {
    background: colors.warning,
    color: colors.navy,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: borderRadius.sm,
    fontSize: fontSizes.xs,
    fontWeight: 700,
  } as React.CSSProperties,

  error: {
    background: colors.error,
    color: colors.white,
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: borderRadius.sm,
    fontSize: fontSizes.xs,
    fontWeight: 700,
  } as React.CSSProperties,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get gradient for header based on color type
 */
export function getHeaderGradient(color: 'blue' | 'red' | 'gold'): string {
  const gradients = {
    blue: `linear-gradient(180deg, ${colors.blueBright} 0%, ${colors.blue} 50%, ${colors.blueDark} 100%)`,
    red: `linear-gradient(180deg, ${colors.redBright} 0%, ${colors.red} 50%, ${colors.redDark} 100%)`,
    gold: `linear-gradient(180deg, ${colors.goldBright} 0%, ${colors.gold} 50%, ${colors.goldDark} 100%)`,
  };
  return gradients[color];
}

/**
 * Get border color for different card types
 */
export function getBorderColor(variant: 'blue' | 'red' | 'gold' | 'success' | 'error'): string {
  const borderColors = {
    blue: colors.blue,
    red: colors.red,
    gold: colors.gold,
    success: colors.success,
    error: colors.error,
  };
  return borderColors[variant];
}

// Export theme object for convenience
export const theme = {
  colors,
  fonts,
  fontSizes,
  spacing,
  borderRadius,
  shadows,
  cardStyles,
  headerStyles,
  buttonStyles,
  inputStyles,
  textStyles,
  layoutStyles,
  modalStyles,
  tableStyles,
  badgeStyles,
};

export default theme;
