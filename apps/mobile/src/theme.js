// Design system Music Match — miroir des tokens web
// (apps/web/app/globals.css, bloc @theme). Toute modification ici doit
// être répercutée côté web, et inversement, pour que les deux applis
// restent le même produit.
//
// Contrastes vérifiés WCAG AA sur `background` et `surface` :
// - text / textMuted / textSubtle : texte (≥ 4.5:1)
// - lineStrong : bordure des champs (≥ 3:1 contre surface, SC 1.4.11)
// - accent → accent2 : dégradé des actions principales, texte blanc
//   ≥ 4.5:1 sur les deux extrémités (5.7:1 et 4.7:1)
// - accentText : liens / texte accentué sur fond sombre

export const colors = {
  background: '#030712',
  surface: '#0f1320',
  surface2: '#151a2b',
  line: '#232a3d',
  lineStrong: '#5b6480',

  text: '#f5f6fa',
  textMuted: '#a3aac0',
  textSubtle: '#8b93ab',
  onAccent: '#ffffff',

  accent: '#7c3aed',
  accent2: '#c026d3',
  accentPressed: '#6d28d9',
  accentText: '#b69cff',
  accent2Text: '#f0abfc',
  focus: '#c4b5fd',
  // Teintes douces pour sélection / chips (web : bg-accent/15, border-accent/40)
  accentSoft: 'rgba(124, 58, 237, 0.15)',
  accentLine: 'rgba(182, 156, 255, 0.45)',
  accent2Soft: 'rgba(192, 38, 211, 0.15)',
  accent2Line: 'rgba(240, 171, 252, 0.4)',

  danger: '#fca5a5',
  dangerBg: 'rgba(127, 29, 29, 0.28)',
  dangerLine: 'rgba(248, 113, 113, 0.45)',
  success: '#6ee7b7',
  successBg: 'rgba(6, 78, 59, 0.35)',
  successLine: 'rgba(52, 211, 153, 0.45)',

  // Halos décoratifs (équivalent BackgroundGlow web)
  glowAccent: 'rgba(124, 58, 237, 0.25)',
  glowAccent2: 'rgba(192, 38, 211, 0.15)',
};

// Dégradé des actions principales. `experimental_backgroundImage` est
// supporté par la New Architecture (défaut SDK 56) ; `backgroundColor`
// sert de repli si le dégradé n'est pas rendu (ex. react-native-web).
export const accentGradient = {
  backgroundColor: colors.accent,
  experimental_backgroundImage: `linear-gradient(90deg, ${colors.accent}, ${colors.accent2})`,
};
export const accentGradientDiagonal = {
  backgroundColor: colors.accent,
  experimental_backgroundImage: `linear-gradient(135deg, ${colors.accent}, ${colors.accent2})`,
};

// Échelle d'espacement (px web = pt mobile). gutter = marge latérale
// d'écran, identique au px-4 du web.
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  gutter: 16,
};

export const radius = {
  sm: 8,
  md: 12,
  field: 14, // rounded-field (0.875rem)
  card: 24, // rounded-card (1.5rem)
  pill: 999,
};

// Tailles alignées sur l'échelle Tailwind (xs → 3xl). Police système
// pour l'instant (pas de chargement de Geist sur mobile).
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
};

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
};

export const lineHeight = {
  xs: 16,
  sm: 20,
  base: 24,
  lg: 28,
  xl: 28,
  '2xl': 32,
  '3xl': 36,
};

// Styles de texte prêts à l'emploi (équivalents des combinaisons de
// classes utilisées sur le web).
export const typography = {
  title: {
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.4,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    lineHeight: 22,
    color: colors.textMuted,
  },
  label: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  body: {
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    color: colors.text,
  },
  caption: {
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    color: colors.textMuted,
  },
  button: {
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.2,
  },
};

// Cibles tactiles : 44pt minimum (Apple HIG / WCAG 2.5.8) ; les champs et
// boutons pleine largeur font 48, comme min-h-12 côté web. Toujours en
// minHeight (jamais height) pour ne pas tronquer le texte agrandi.
export const touch = {
  min: 44,
  control: 48,
};

export const shadow = {
  card: {
    boxShadow: '0px 24px 48px -16px rgba(0, 0, 0, 0.6)',
  },
  glow: {
    boxShadow: '0px 8px 24px -8px rgba(124, 58, 237, 0.6)',
  },
};

const theme = {
  colors,
  accentGradient,
  accentGradientDiagonal,
  spacing,
  radius,
  fontSize,
  fontWeight,
  lineHeight,
  typography,
  touch,
  shadow,
};

export default theme;
