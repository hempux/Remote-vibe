export const colors = {
  // Backgrounds
  background: '#0a0a1a',
  backgroundLight: '#12122a',
  backgroundCard: 'rgba(255, 255, 255, 0.08)',
  backgroundCardHover: 'rgba(255, 255, 255, 0.12)',
  backgroundOverlay: 'rgba(10, 10, 26, 0.85)',

  // Neon accents
  electricBlue: '#00d4ff',
  neonPurple: '#a855f7',
  hotPink: '#ec4899',
  neonGreen: '#22c55e',
  neonYellow: '#eab308',
  neonRed: '#ef4444',

  // Glass borders
  glassBorder: 'rgba(255, 255, 255, 0.12)',
  glassBorderLight: 'rgba(255, 255, 255, 0.18)',

  // Text
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.45)',
  textMuted: 'rgba(255, 255, 255, 0.3)',

  // Status colors
  statusProcessing: '#00d4ff',
  statusWaiting: '#eab308',
  statusCompleted: '#22c55e',
  statusIdle: 'rgba(255, 255, 255, 0.4)',
  statusError: '#ef4444',

  // Gradients (as arrays for LinearGradient)
  gradientPrimary: ['#00d4ff', '#a855f7'] as const,
  gradientAccent: ['#a855f7', '#ec4899'] as const,
  gradientWarm: ['#ec4899', '#eab308'] as const,
  gradientMesh: ['#0a0a1a', '#0f1530', '#0a0a1a'] as const,
  gradientGlass: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'] as const,

  // Tab bar
  tabBarBackground: 'rgba(15, 15, 40, 0.92)',
  tabBarBorder: 'rgba(255, 255, 255, 0.08)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
} as const;

export const typography = {
  header: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  subheader: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.2,
  },
  small: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
} as const;
