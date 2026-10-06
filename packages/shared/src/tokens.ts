/**
 * Punchcard design tokens: one source for the Expo app (`apps/mobile/src/theme`)
 * and the web (`toCssVars` -> `apps/web/app/tokens.css`). Pure data, no deps.
 *
 * Identity: industrial, premium, native. Charcoal and warm paper surfaces,
 * safety-orange accent, steel-grey secondaries. Numbers are unitless
 * (density-independent points on mobile, CSS px on the web).
 *
 * Client swatches (`CLIENT_PALETTE`) are domain data and live elsewhere.
 */

export type ColorScheme = "light" | "dark";

export type ColorRole =
  | "surface"
  | "surfaceElevated"
  | "surfaceSunken"
  | "text"
  | "textSecondary"
  | "textTertiary"
  | "accent"
  | "accentPressed"
  | "accentSoft"
  | "accentText"
  | "onAccent"
  | "success"
  | "warning"
  | "danger"
  | "separator"
  | "border";

export type ColorPalette = Record<ColorRole, string>;

export const colors = {
  light: {
    /** Warm paper: the page and screen background. */
    surface: "#F4F1EA",
    /** Cards, sheets, grouped rows. */
    surfaceElevated: "#FFFDF8",
    /** Wells, inputs, inset lists. */
    surfaceSunken: "#E8E3D7",
    text: "#15171A",
    /** Steel grey for secondary copy. */
    textSecondary: "#555D68",
    /** Placeholders and disabled labels only (not body copy). */
    textTertiary: "#868D97",
    /** Safety orange: fills, the Start button, focus rings. Not for small text on paper. */
    accent: "#FF6A1A",
    accentPressed: "#E85A0C",
    accentSoft: "#FFE2CF",
    /** Orange that reads as text and links on light surfaces (WCAG AA). */
    accentText: "#A33E05",
    /** Text and icons on an accent fill: charcoal, like hazard signage. */
    onAccent: "#15171A",
    success: "#1C7A43",
    warning: "#966210",
    danger: "#B4302A",
    separator: "#DAD4C6",
    border: "#C6BFAF",
  },
  dark: {
    /** Charcoal. */
    surface: "#15171A",
    surfaceElevated: "#1F2226",
    /**
     * Wells, inputs and secondary fills. Lifted above the page in dark mode (tonal fill, as on
     * iOS/Material): a well darker than charcoal measured 1.05:1 and disappeared.
     */
    surfaceSunken: "#2C3035",
    text: "#F2EFE8",
    textSecondary: "#9CA4AE",
    textTertiary: "#6C737C",
    accent: "#FF7E3A",
    accentPressed: "#FF9459",
    accentSoft: "#3B2417",
    accentText: "#FF8C4E",
    onAccent: "#15171A",
    success: "#46C47E",
    warning: "#E8A93F",
    danger: "#FF6E61",
    /** Hairlines: 1.4:1 on `surfaceElevated` (the old #2C3035 was 1.2:1 and vanished). */
    separator: "#363B41",
    border: "#3A3F45",
  },
} as const satisfies Record<ColorScheme, ColorPalette>;

/** 4-pt spacing scale. */
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export type SpacingToken = keyof typeof spacing;

export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;
export type RadiusToken = keyof typeof radius;

/** React Native `fontWeight` strings; valid CSS `font-weight` values too. */
export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  heavy: "800",
} as const;
export type FontWeight = (typeof fontWeight)[keyof typeof fontWeight];

export type TextStyleToken = {
  fontSize: number;
  lineHeight: number;
  fontWeight: FontWeight;
  /** Tracking in points/px (RN `letterSpacing`). */
  letterSpacing: number;
  /** Tabular (fixed-width) figures, so timers and money never jump. */
  tabular: boolean;
};

/** Type scale. Text is SF Pro / Roboto on device; `display` is the one clock size. */
export const type = {
  display: { fontSize: 56, lineHeight: 64, fontWeight: fontWeight.semibold, letterSpacing: -1.5, tabular: true },
  title: { fontSize: 28, lineHeight: 34, fontWeight: fontWeight.bold, letterSpacing: -0.4, tabular: false },
  headline: { fontSize: 20, lineHeight: 26, fontWeight: fontWeight.semibold, letterSpacing: -0.2, tabular: false },
  body: { fontSize: 17, lineHeight: 22, fontWeight: fontWeight.regular, letterSpacing: -0.2, tabular: false },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: fontWeight.regular, letterSpacing: -0.1, tabular: false },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: fontWeight.medium, letterSpacing: 0, tabular: false },
} as const satisfies Record<string, TextStyleToken>;
export type TypeToken = keyof typeof type;

export type SpringConfig = { damping: number; stiffness: number; mass: number };
export type Bezier = readonly [number, number, number, number];

export const motion = {
  /** Milliseconds. */
  duration: { fast: 150, base: 250, slow: 400 },
  /** Cubic-bezier control points (CSS `cubic-bezier()`, Reanimated `Easing.bezier`). */
  easing: {
    standard: [0.2, 0, 0, 1],
    exit: [0.3, 0, 1, 1],
  },
  /** Reanimated `withSpring` configs. */
  spring: {
    /** Buttons, the Start/Stop morph, toggles. */
    snappy: { damping: 20, stiffness: 320, mass: 1 },
    /** Sheets, cards, onboarding parallax. */
    gentle: { damping: 18, stiffness: 140, mass: 1 },
  },
} as const satisfies {
  duration: Record<string, number>;
  easing: Record<string, Bezier>;
  spring: Record<string, SpringConfig>;
};

export type ShadowToken = {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  /** Shadow colour is always charcoal (`SHADOW_COLOR`); opacity carries the weight. */
  opacity: number;
  /** Android elevation equivalent. */
  elevation: number;
};

export const SHADOW_COLOR = "#15171A";

/** Dark mode leans on elevated surface colour, so its shadows are deeper but used sparingly. */
export const shadows = {
  light: {
    sm: { offsetX: 0, offsetY: 1, blur: 2, spread: 0, opacity: 0.08, elevation: 1 },
    md: { offsetX: 0, offsetY: 6, blur: 16, spread: -4, opacity: 0.16, elevation: 4 },
    lg: { offsetX: 0, offsetY: 18, blur: 40, spread: -12, opacity: 0.28, elevation: 12 },
  },
  dark: {
    sm: { offsetX: 0, offsetY: 1, blur: 2, spread: 0, opacity: 0.4, elevation: 1 },
    md: { offsetX: 0, offsetY: 6, blur: 16, spread: -4, opacity: 0.5, elevation: 4 },
    lg: { offsetX: 0, offsetY: 18, blur: 40, spread: -12, opacity: 0.6, elevation: 12 },
  },
} as const satisfies Record<ColorScheme, Record<"sm" | "md" | "lg", ShadowToken>>;
export type ShadowLevel = keyof (typeof shadows)["light"];

export const tokens = { colors, spacing, radius, fontWeight, type, motion, shadows } as const;
export type Tokens = typeof tokens;

export type CssVarName = `--pc-${string}`;

function kebab(value: string): string {
  return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function shadowCss(shadow: ShadowToken): string {
  const r = parseInt(SHADOW_COLOR.slice(1, 3), 16);
  const g = parseInt(SHADOW_COLOR.slice(3, 5), 16);
  const b = parseInt(SHADOW_COLOR.slice(5, 7), 16);
  return `${shadow.offsetX} ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px rgb(${r} ${g} ${b} / ${shadow.opacity})`;
}

/**
 * Flat `--pc-*` custom properties for one scheme, e.g.
 * `--pc-color-on-accent`, `--pc-space-md: 16px`, `--pc-font-size-body: 17px`.
 * Non-colour tokens are identical in both schemes.
 */
export function toCssVars(scheme: ColorScheme): Record<CssVarName, string> {
  const vars: Record<CssVarName, string> = {};
  for (const [role, value] of Object.entries(colors[scheme])) vars[`--pc-color-${kebab(role)}`] = value;
  for (const [name, value] of Object.entries(spacing)) vars[`--pc-space-${name}`] = `${value}px`;
  for (const [name, value] of Object.entries(radius)) vars[`--pc-radius-${name}`] = `${value}px`;
  for (const [name, style] of Object.entries(type)) {
    vars[`--pc-font-size-${name}`] = `${style.fontSize}px`;
    vars[`--pc-line-height-${name}`] = `${style.lineHeight}px`;
    vars[`--pc-font-weight-${name}`] = style.fontWeight;
    vars[`--pc-letter-spacing-${name}`] = `${style.letterSpacing}px`;
  }
  for (const [name, ms] of Object.entries(motion.duration)) vars[`--pc-duration-${name}`] = `${ms}ms`;
  for (const [name, points] of Object.entries(motion.easing)) {
    vars[`--pc-ease-${name}`] = `cubic-bezier(${points.join(", ")})`;
  }
  for (const [name, shadow] of Object.entries(shadows[scheme])) vars[`--pc-shadow-${name}`] = shadowCss(shadow);
  return vars;
}
