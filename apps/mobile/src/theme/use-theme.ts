import {
  colors as tokenColors,
  SHADOW_COLOR,
  shadows,
  type ColorPalette,
  type ColorScheme,
  type ShadowLevel,
} from '@punchcard/shared/tokens';
import { useEffect } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { useSettings } from '@/hooks/use-settings';

import { resolveAccent, type AccentId } from './accents';

export type ThemeColors = ColorPalette & {
  /** Label on a `danger` fill (the Stop button). */
  onDanger: string;
  /** Inverted surface for toasts and the Lock Screen mock. */
  inverseSurface: string;
  inverseText: string;
  /** Accent text/link colour on `inverseSurface` (the toast action), from the opposite scheme. */
  inverseAccentText: string;
  /** Dimmed backdrop behind transient overlays. */
  scrim: string;
};

export type Theme = {
  scheme: ColorScheme;
  isDark: boolean;
  accentId: AccentId;
  colors: ThemeColors;
  /**
   * CSS `boxShadow` for an elevation level (never legacy shadow/elevation props). Only for
   * opaque, rounded, unclipped views: never on glass, blur or `overflow: 'hidden'` views.
   */
  shadow: (level: ShadowLevel) => string;
};

function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

const SHADOW_RGB = hexToRgb(SHADOW_COLOR);
/** Dark mode drops shadows below the charcoal page, so they read as depth instead of vanishing. */
const DARK_DROP_RGB = hexToRgb(tokenColors.dark.surfaceSunken);

/**
 * Dark mode elevation. The token shadow colour is the dark page colour itself, so a charcoal
 * shadow is invisible on the page and a muddy dark halo wherever a floating surface overlaps
 * content (the sheet header, the toast). Elevation in dark mode comes from the lighter
 * `surfaceElevated` fill plus a 1 pt separator rim, with a short, faint drop underneath.
 */
function darkShadow(level: ShadowLevel): string {
  const s = shadows.dark[level];
  const rim = `0px 0px 0px 1px ${tokenColors.dark.separator}`;
  if (level === 'sm') return rim;
  return `${rim}, ${s.offsetX}px ${s.offsetY / 2}px ${s.blur / 2}px ${s.spread / 2}px rgba(${DARK_DROP_RGB}, ${s.opacity / 2})`;
}

const cache = new Map<string, Theme>();

/** Build (and memoise) a resolved theme for a scheme + accent. Usable outside React. */
export function buildTheme(scheme: ColorScheme, accentId: string | undefined | null): Theme {
  const accent = resolveAccent(accentId);
  const key = `${scheme}:${accent.id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = tokenColors[scheme];
  const inverse = tokenColors[scheme === 'dark' ? 'light' : 'dark'];
  const colors: ThemeColors = {
    ...base,
    ...accent[scheme],
    onDanger: scheme === 'dark' ? base.onAccent : tokenColors.light.surfaceElevated,
    inverseSurface: inverse.surfaceElevated,
    inverseText: inverse.text,
    inverseAccentText: accent[scheme === 'dark' ? 'light' : 'dark'].accentText,
    scrim: `rgba(${SHADOW_RGB}, ${scheme === 'dark' ? 0.6 : 0.35})`,
  };
  const levels = shadows[scheme];
  const theme: Theme = {
    scheme,
    isDark: scheme === 'dark',
    accentId: accent.id,
    colors,
    shadow:
      scheme === 'dark'
        ? darkShadow
        : (level) => {
            const s = levels[level];
            return `${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px rgba(${SHADOW_RGB}, ${s.opacity})`;
          },
  };
  cache.set(key, theme);
  return theme;
}

/**
 * The resolved theme: shared tokens for the current colour scheme (`settings.appearance`
 * override, else the OS), with the user's accent (`settings.accent`) applied. Referentially
 * stable per scheme + accent.
 */
export function useTheme(): Theme {
  const system = useColorScheme();
  const { accent, appearance } = useSettings();
  const scheme: ColorScheme = appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : appearance;
  return buildTheme(scheme, accent);
}

/**
 * Mirrors `settings.appearance` into the OS-level override so native chrome (alerts, pickers,
 * keyboards, `@expo/ui` hosts) matches. Mount once in the root layout, after migrations.
 */
export function useAppearanceOverride(): void {
  const { appearance } = useSettings();
  useEffect(() => {
    Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
  }, [appearance]);
}
