import { View } from 'react-native';

import { compactDuration, formatTimeRange, money } from '@/constants/format';
import type { EntryWithClient } from '@/data';
import { radius, spacing, touchTarget, useTheme } from '@/theme';

import { AppText } from './app-text';
import { ClientBar } from './client-bar';
import { Duration } from './duration';
import { Icon } from './icon';
import { Money } from './money';

export type EntryRowProps = {
  entry: EntryWithClient;
  /** Worked seconds (breaks excluded); computed by the caller so running rows can tick. */
  seconds: number;
  earningsCents: number;
  photoCount?: number;
  /** Hide the client name when the row already sits under a client heading. */
  showClient?: boolean;
  pressed?: boolean;
};

/**
 * Visual content of one time entry. Wrap it in a Link / Pressable to make it interactive. The
 * row paints the `ListGroup` fill itself so the iOS context-menu lift shows the real surface.
 */
export function EntryRow({ entry, seconds, earningsCents, photoCount = 0, showClient = true, pressed }: EntryRowProps) {
  const { colors } = useTheme();
  const running = !entry.endedAt;
  const title = showClient ? entry.clientName : entry.jobName || 'General';
  const detail = [formatTimeRange(entry.startedAt, entry.endedAt), showClient ? entry.jobName : null]
    .filter(Boolean)
    .join(' · ');
  const label = [
    title,
    detail,
    running ? 'running' : null,
    compactDuration(seconds),
    money(earningsCents, entry.currency),
    entry.note ? `Note: ${entry.note}` : null,
    photoCount ? `${photoCount} photo${photoCount === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        paddingVertical: spacing.sm + spacing.xs,
        paddingHorizontal: spacing.md,
        minHeight: touchTarget + spacing.md,
        backgroundColor: pressed ? colors.surfaceSunken : colors.surfaceElevated,
      }}
    >
      <ClientBar color={entry.clientColor} />
      <View style={{ flex: 1, gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <AppText variant="body" weight="600" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </AppText>
          {running ? (
            <View style={{ paddingHorizontal: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.accentSoft }}>
              <AppText variant="caption" weight="700" tone="accent">
                Running
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="caption" tone="secondary" numberOfLines={1} tabular>
          {detail}
        </AppText>
        {entry.note || photoCount || entry.editedNote ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {photoCount ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Icon sf="photo" md="photo" size={14} color={colors.textSecondary} />
                <AppText variant="caption" tone="secondary" tabular>
                  {photoCount}
                </AppText>
              </View>
            ) : null}
            {entry.editedNote ? <Icon sf="pencil" md="edit" size={13} color={colors.textSecondary} /> : null}
            {entry.note ? (
              <AppText variant="caption" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
                {entry.note}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
        <Duration seconds={seconds} variant="body" weight="600" />
        <Money cents={earningsCents} currency={entry.currency} variant="caption" tone="secondary" selectable={false} />
      </View>
    </View>
  );
}
