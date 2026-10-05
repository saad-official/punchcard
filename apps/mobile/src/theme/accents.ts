// The four curated accents a user can pick in Settings > Appearance (`settings.accent`).
// Every accent keeps charcoal `onAccent` text (hazard-signage contrast), so only the accent
// roles change; surfaces, text and status colours always come from the shared tokens.
import { colors, type ColorScheme } from '@punchcard/shared/tokens';

export type AccentRoles = { accent: string; accentPressed: string; accentSoft: string; accentText: string };

export type AccentId = 'safety' | 'signal' | 'hivis' | 'survey';

export type AccentDefinition = { id: AccentId; label: string; light: AccentRoles; dark: AccentRoles };

const pick = (scheme: ColorScheme): AccentRoles => ({
  accent: colors[scheme].accent,
  accentPressed: colors[scheme].accentPressed,
  accentSoft: colors[scheme].accentSoft,
  accentText: colors[scheme].accentText,
});

export const ACCENTS: readonly AccentDefinition[] = [
  { id: 'safety', label: 'Safety orange', light: pick('light'), dark: pick('dark') },
  {
    id: 'signal',
    label: 'Signal yellow',
    light: { accent: '#F2B705', accentPressed: '#D9A300', accentSoft: '#FCEFC2', accentText: '#7A5A00' },
    dark: { accent: '#FFC629', accentPressed: '#FFD45C', accentSoft: '#3A3016', accentText: '#FFD04D' },
  },
  {
    id: 'hivis',
    label: 'Hi-vis green',
    light: { accent: '#7BC62D', accentPressed: '#69AE22', accentSoft: '#E3F2CF', accentText: '#3D6B0E' },
    dark: { accent: '#93D94A', accentPressed: '#A8E36A', accentSoft: '#24301A', accentText: '#9EE05A' },
  },
  {
    id: 'survey',
    label: 'Survey blue',
    light: { accent: '#2BB3D9', accentPressed: '#1E9CC0', accentSoft: '#D3EEF6', accentText: '#0B5E78' },
    dark: { accent: '#4CC6EA', accentPressed: '#72D3F0', accentSoft: '#16303A', accentText: '#62CFEF' },
  },
];

export const DEFAULT_ACCENT: AccentId = 'safety';

export function resolveAccent(id: string | undefined | null): AccentDefinition {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
}
