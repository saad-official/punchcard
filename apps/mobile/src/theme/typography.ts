import type { TextStyle } from 'react-native';
import { type, type TypeToken } from '@punchcard/shared/tokens';

/** RN text style for a type-scale step. Tabular steps get fixed-width figures. */
export function typeStyle(token: TypeToken): TextStyle {
  const t = type[token];
  return {
    fontSize: t.fontSize,
    lineHeight: t.lineHeight,
    fontWeight: t.fontWeight,
    letterSpacing: t.letterSpacing,
    ...(t.tabular ? { fontVariant: ['tabular-nums'] } : null),
  };
}

/** Pre-built styles for every step, so components never rebuild them per render. */
export const textStyles = {
  display: typeStyle('display'),
  title: typeStyle('title'),
  headline: typeStyle('headline'),
  body: typeStyle('body'),
  callout: typeStyle('callout'),
  caption: typeStyle('caption'),
} as const satisfies Record<TypeToken, TextStyle>;

/** Fixed-width figures for any number that changes in place (timers, money, totals). */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

/** Small-caps style label (section headers, stat labels). Pair with the `caption` step. */
export const overline: TextStyle = { textTransform: 'uppercase', letterSpacing: 0.6 };
