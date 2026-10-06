// Mock UI used as onboarding art: built from the real tokens so it always matches the app.
import { formatDuration } from '@punchcard/shared';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ClientBar } from '@/components/client-bar';
import { Icon } from '@/components/icon';
import { formatTime, money } from '@/constants/format';
import { earningsFor } from '@/data';
import { useNowSeconds } from '@/hooks/use-now';
import { buildTheme, radius, spacing, tabular, textStyles, useTheme } from '@/theme';

const DEMO_RATE_CENTS = 6500;
/** The mock Live Activity starts 1 h 12 min in, then ticks for real. */
const DEMO_OFFSET_SECONDS = 72 * 60;

export function TapOnceArt() {
  const { colors, shadow } = useTheme();
  return (
    <View style={{ gap: spacing.md, width: '100%' }}>
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          backgroundColor: colors.surfaceElevated,
          boxShadow: shadow('sm'),
        }}
      >
        <ClientBar color="teal" />
        <View style={{ flex: 1 }}>
          <AppText variant="headline">Smith kitchen</AppText>
          <AppText variant="callout" tone="secondary">
            {`Tiling · ${money(DEMO_RATE_CENTS, 'USD')}/h`}
          </AppText>
        </View>
      </View>
      <View
        style={{
          minHeight: spacing.xxl * 2,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          backgroundColor: colors.accent,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.md,
        }}
      >
        <Icon sf="play.fill" md="play_arrow" size={32} color={colors.onAccent} />
        <AppText variant="title" style={{ color: colors.onAccent }}>
          Start
        </AppText>
      </View>
    </View>
  );
}

export function LockScreenArt() {
  const { accentId } = useTheme();
  // The Lock Screen is always dark, whatever the app theme.
  const dark = buildTheme('dark', accentId);
  const c = dark.colors;
  const now = useNowSeconds(true);
  const seconds = DEMO_OFFSET_SECONDS + (now % 3600);
  return (
    <View
      style={{
        width: '100%',
        borderRadius: radius.lg + spacing.sm,
        borderCurve: 'continuous',
        backgroundColor: c.surfaceSunken,
        padding: spacing.md,
        paddingTop: spacing.lg,
        gap: spacing.lg,
        alignItems: 'center',
      }}
      accessible
      accessibilityLabel="Example Lock Screen with a running Punchcard timer for Smith kitchen"
    >
      <AppText variant="display" style={{ color: c.text, fontWeight: '300' }} tabular>
        {formatTime(new Date(now * 1000)).replace(/\s?[AP]M$/i, '')}
      </AppText>
      <View
        style={{
          alignSelf: 'stretch',
          flexDirection: 'row',
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          backgroundColor: c.surfaceElevated,
        }}
      >
        <ClientBar color="teal" />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="caption" style={{ color: c.textSecondary }}>
            PUNCHCARD · Smith kitchen
          </AppText>
          <AppText style={[textStyles.title, tabular, { color: c.text }]}>{formatDuration(seconds)}</AppText>
          <AppText variant="callout" style={{ color: c.textSecondary }} tabular>
            {`${money(earningsFor(seconds, DEMO_RATE_CENTS), 'USD')} earned`}
          </AppText>
        </View>
        <View style={{ gap: spacing.sm, justifyContent: 'center' }}>
          <Chip label="Break" bg={c.surfaceSunken} fg={c.text} />
          <Chip label="Stop" bg={c.danger} fg={c.onDanger} />
        </View>
      </View>
    </View>
  );
}

function Chip({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: bg }}>
      <AppText variant="caption" weight="700" style={{ color: fg }} align="center">
        {label}
      </AppText>
    </View>
  );
}

const ROWS = [
  { day: 'Mon', client: 'Smith kitchen', color: 'teal' as const, hours: '7.50', amount: 48750 },
  { day: 'Tue', client: 'Harbour cafe', color: 'amber' as const, hours: '6.25', amount: 37500 },
  { day: 'Wed', client: 'Smith kitchen', color: 'teal' as const, hours: '8.00', amount: 52000 },
];

export function TimesheetArt() {
  const { accentId, shadow } = useTheme();
  // A printed timesheet is paper in any theme.
  const paper = buildTheme('light', accentId).colors;
  return (
    <View
      style={{
        width: '100%',
        borderRadius: radius.md,
        borderCurve: 'continuous',
        backgroundColor: paper.surfaceElevated,
        padding: spacing.lg,
        gap: spacing.sm,
        boxShadow: shadow('lg'),
        transform: [{ rotate: '-2deg' }],
      }}
      accessible
      accessibilityLabel="Example PDF timesheet with three days of work and a total"
    >
      <View style={{ height: spacing.sm, borderRadius: radius.pill, backgroundColor: paper.accent, marginBottom: spacing.sm }} />
      <AppText variant="headline" style={{ color: paper.text }}>
        Timesheet
      </AppText>
      <AppText variant="caption" style={{ color: paper.textSecondary }}>
        Oct 5 – Oct 11
      </AppText>
      {ROWS.map((r) => (
        <View key={r.day} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}>
          <ClientBar color={r.color} style={{ height: spacing.md, alignSelf: 'center' }} />
          <AppText variant="callout" style={{ color: paper.textSecondary, width: spacing.xl + spacing.sm }}>
            {r.day}
          </AppText>
          <AppText variant="callout" style={{ color: paper.text, flex: 1 }} numberOfLines={1}>
            {r.client}
          </AppText>
          <AppText variant="callout" style={{ color: paper.text }} tabular>
            {`${r.hours} h`}
          </AppText>
        </View>
      ))}
      <View style={{ height: 2, backgroundColor: paper.text, marginVertical: spacing.xs }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText variant="body" weight="700" style={{ color: paper.text }}>
          Total 21.75 h
        </AppText>
        <AppText variant="body" weight="700" style={{ color: paper.text }} tabular>
          {money(ROWS.reduce((n, r) => n + r.amount, 0), 'USD')}
        </AppText>
      </View>
    </View>
  );
}
