/**
 * CureVirtual Mobile Design System
 * Mirrors the web app's CSS design tokens exactly.
 * Import from here in all screens to ensure pixel-perfect consistency.
 */

// =============================================
// 🎨 BRAND COLORS (matches web :root variables)
// =============================================
export const COLORS = {
  // Brand Palette
  brandGreen: '#008f11',      // --brand-green (PRIMARY CTA)
  brandGreenGlow: 'rgba(0, 143, 17, 0.4)',
  brandBlue: '#006aff',       // --brand-blue (links, secondary)
  brandBlueGlow: 'rgba(0, 106, 255, 0.4)',
  brandOrange: '#ff7b00',     // --brand-orange (accent)
  brandOrangeGlow: 'rgba(255, 123, 0, 0.4)',

  // Semantic
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  dangerLight: '#fee2e2',

  // Light Theme Backgrounds (default)
  bgMain: '#ffffff',
  bgCard: '#ffffff',
  bgMuted: '#f8fafc',
  bgInput: '#f1f5f9',

  // Dark Theme Backgrounds
  darkBgMain: '#1e293b',
  darkBgCard: '#334155',

  // Text
  textMain: '#1a1a1a',
  textSoft: '#333333',
  textMuted: '#666666',
  textPlaceholder: '#94a3b8',

  // Neutral Scale (slate)
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',

  // White / Black
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  // Borders
  border: 'rgba(0, 0, 0, 0.1)',
  borderDark: 'rgba(255, 255, 255, 0.08)',
};

// =============================================
// 📐 SPACING (8-point grid)
// =============================================
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  section: 48,
};

// =============================================
// 🔤 TYPOGRAPHY
// =============================================
export const TYPOGRAPHY = {
  // Font sizes
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  display: 32,
  hero: 36,

  // Font weights
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  black: '900',

  // Line heights
  tight: 1.1,
  normal: 1.4,
  relaxed: 1.6,
};

// =============================================
// 🔲 BORDER RADIUS
// =============================================
export const RADIUS = {
  sm: 6,
  md: 8,
  base: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

// =============================================
// 💠 SHADOWS
// =============================================
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  green: {
    shadowColor: '#008f11',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  blue: {
    shadowColor: '#006aff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
};

// =============================================
// ♻️ REUSABLE COMPONENT STYLES
// =============================================
export const COMPONENTS = {
  // Screen container
  screen: {
    flex: 1,
    backgroundColor: COLORS.bgMuted,
  },

  // Card
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.base,
    padding: SPACING.base,
    ...SHADOWS.sm,
  },

  // Input field
  input: {
    backgroundColor: COLORS.bgInput,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: RADIUS.base,
    padding: SPACING.base,
    fontSize: TYPOGRAPHY.md,
    color: COLORS.textMain,
  },

  // Primary button (GREEN)
  primaryButton: {
    backgroundColor: COLORS.brandGreen,
    borderRadius: RADIUS.base,
    padding: SPACING.base,
    alignItems: 'center',
    ...SHADOWS.green,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.md,
    fontWeight: TYPOGRAPHY.semiBold,
    letterSpacing: 0.5,
  },

  // Secondary button (BLUE)
  secondaryButton: {
    backgroundColor: COLORS.brandBlue,
    borderRadius: RADIUS.base,
    padding: SPACING.base,
    alignItems: 'center',
    ...SHADOWS.blue,
  },

  // Section title
  sectionTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.slate700,
    marginBottom: SPACING.base,
  },

  // Label
  label: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.brandGreen,
    fontWeight: TYPOGRAPHY.black,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
};

export default {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
  SHADOWS,
  COMPONENTS,
};
