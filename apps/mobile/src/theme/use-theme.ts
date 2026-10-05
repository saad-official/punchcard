import {
  colors as tokenColors,
  SHADOW_COLOR,
  shadows,
  type ColorPalette,
  type ColorScheme,
  type ShadowLevel,
} from '@punchcard/shared/tokens';
import { useColorScheme } from 'react-native';

import { useSettings } from '@/hooks/use-settings';

import { resolveAccent, type AccentId } from './accents';

export type ThemeColors = ColorPalette & {
  /** Label on a `danger` fill (the Stop button). */
  onDanger: string;
  /** Inverted surface for toasts and the Lock Screen mock. */
  inverseSurface: string;
  inverseText: string;
  /** Dimmed backdrop behind transient overlays. */
  scrim: string;
};

export type Theme = {
  scheme: ColorScheme;
  isDark: boolean;
  accentId: AccentId;
  colors: ThemeColors;
  /** CSS `boxShadow` for an elevation level (never legacy shadow props). */
  shadow: (level: ShadowLevel) => string;
};

function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

const SHADOW_RGB = hexToRgb(SHADOW_COLOR);

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
    scrim: `rgba(${SHADOW_RGB}, ${scheme === 'dark' ? 0.6 : 0.35})`,
  };
  const levels = shadows[scheme];
  const theme: Theme = {
    scheme,
    isDark: scheme === 'dark',
    accentId: accent.id,
    colors,
    shadow: (level) => {
      const s = levels[level];
      return `${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px rgba(${SHADOW_RGB}, ${s.opacity})`;
    },
  };
  cache.set(key, theme);
  return theme;
}

/**
 * The resolved theme: shared tokens for the current colour scheme, with the user's accent
 * (`settings.accent`) applied. Referentially stable per scheme + accent.
 */
export function useTheme(): Theme {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const { accent } = useSettings();
  return buildTheme(scheme, accent);
}
