import {
  dayKey,
  elapsedSeconds,
  historyFloor,
  splitAtMidnight,
  weekRange,
  type WeekRange,
} from '@punchcard/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ActionSheet } from '@/components/action-sheet';
import { AppText } from '@/components/app-text';
import { ClientBar } from '@/components/client-bar';
import { Duration } from '@/components/duration';
import { EmptyState } from '@/components/empty-state';
import { HeaderActions } from '@/components/header-actions';
import { ListGroup } from '@/components/list-row';
import { Money } from '@/components/money';
import { PrimaryButton } from '@/components/primary-button';
import { openPaywall } from '@/components/pro-badge';
import { Screen } from '@/components/screen';
import { dayKeyToDate, WeekDays, WeekStrip } from '@/components/week-strip';
import { formatDayLong, formatMonthDay } from '@/constants/format';
import { dayRange, deviceTimeZone, earningsFor, type EntryWithClient } from '@/data';
import { useEntries } from '@/hooks/use-entries';
import { useNowSeconds } from '@/hooks/use-now';
import { useSettings } from '@/hooks/use-settings';
import { usePlan } from '@/native/purchases';
import { radius, spacing, useTheme } from '@/theme';

import { duplicate, editEntry, remove } from './entry-actions';
import { EntryItem } from './entry-item';

const WEEKS_BACK = 104;
const DAY_MS = 86_400_000;
const HALF_DAY_MS = DAY_MS / 2;

type Group = { clientId: string; name: string; color: EntryWithClient['clientColor']; currency: string; seconds: number; cents: number; entries: { entry: EntryWithClient; seconds: number; cents: number }[] };

/** The last two years of weeks, oldest first (memoised by the React Compiler on its inputs). */
function buildWeeks(currentWeekStart: string, weekStartsOn: number, tz: string): WeekRange[] {
  const list: WeekRange[] = [];
  for (let i = WEEKS_BACK; i >= 0; i--) {
    // Mid-day of the same weekday i weeks ago: safe across DST shifts.
    const probe = new Date(Date.parse(currentWeekStart) - i * 7 * DAY_MS + HALF_DAY_MS).toISOString();
    list.push(weekRange(probe, weekStartsOn, tz));
  }
  return list;
}

export function TimesheetScreen() {
  const { weekStartsOn } = useSettings();
  const plan = usePlan();
  const tz = deviceTimeZone();
  const nowIso = new Date(useNowSeconds(false) * 1000).toISOString();
  const today = dayKey(nowIso, tz);
  const [selectedDay, setSelectedDay] = useState(today);
  const [menuEntry, setMenuEntry] = useState<EntryWithClient | null>(null);

  const currentWeekStart = weekRange(nowIso, weekStartsOn, tz).start;
  const weeks = buildWeeks(currentWeekStart, weekStartsOn, tz);

  const weekIndex = Math.max(0, weeks.findIndex((w) => w.days.includes(selectedDay)));
  const week = weeks[weekIndex];

  const selectWeek = (i: number) => {
    const pos = week.days.indexOf(selectedDay);
    const next = weeks[i]?.days[pos < 0 ? 0 : pos];
    if (next) setSelectedDay(next > today ? today : next);
  };

  const floor = historyFloor(plan, nowIso);
  const selectedRange = dayRange(dayKeyToDate(selectedDay), tz);
  const lockedByPlan = !!floor && selectedRange.to <= floor;

  return (
    <>
      <HeaderActions
        actions={[
          ...(selectedDay !== today
            ? [{ key: 'today', label: 'Jump to today', sf: 'calendar.badge.clock' as const, md: 'today' as const, onPress: () => setSelectedDay(today) }]
            : []),
          {
            key: 'add',
            label: 'Add entry',
            sf: 'plus',
            md: 'add',
            onPress: () => router.push({ pathname: '/entry-editor', params: { day: selectedDay } }),
          },
        ]}
      />
      <Screen contentStyle={{ gap: spacing.md }}>
        <WeekHeader week={week} tz={tz} nowIso={nowIso} />
        <WeekStrip
          weeks={weeks}
          index={weekIndex}
          onIndexChange={selectWeek}
          renderWeek={(w) => (
            <WeekPage week={w} tz={tz} nowIso={nowIso} today={today} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
          )}
        />
        <AppText variant="headline" accessibilityRole="header" style={{ paddingTop: spacing.sm }}>
          {formatDayLong(dayKeyToDate(selectedDay))}
        </AppText>
        {lockedByPlan ? (
          <HistoryLocked />
        ) : (
          <DayEntries range={selectedRange} nowIso={nowIso} day={selectedDay} onLongPress={setMenuEntry} />
        )}
      </Screen>
      {process.env.EXPO_OS === 'android' ? (
        <ActionSheet
          visible={!!menuEntry}
          onClose={() => setMenuEntry(null)}
          title={menuEntry ? `${menuEntry.clientName}${menuEntry.jobName ? ` · ${menuEntry.jobName}` : ''}` : undefined}
          actions={
            menuEntry
              ? [
                  { key: 'edit', label: 'Edit', sf: 'pencil', md: 'edit', onPress: () => editEntry(menuEntry) },
                  ...(menuEntry.endedAt
                    ? [{ key: 'dup', label: 'Duplicate', sf: 'plus.square.on.square' as const, md: 'content_copy' as const, onPress: () => duplicate(menuEntry) }]
                    : []),
                  { key: 'delete', label: 'Delete', sf: 'trash', md: 'delete', destructive: true, onPress: () => remove(menuEntry) },
                ]
              : []
          }
        />
      ) : null}
    </>
  );
}

/** Worked seconds per local day (entries crossing midnight are split, breaks pro-rated). */
function totalsByDay(entries: readonly EntryWithClient[], tz: string, nowIso: string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const e of entries) {
    for (const seg of splitAtMidnight(e, tz, nowIso)) totals[seg.day] = (totals[seg.day] ?? 0) + seg.netSeconds;
  }
  return totals;
}

function WeekHeader({ week, tz, nowIso }: { week: WeekRange; tz: string; nowIso: string }) {
  const entries = useEntries({ from: week.start, to: week.end });
  const totals = totalsByDay(entries, tz, nowIso);
  const seconds = week.days.reduce((n, d) => n + (totals[d] ?? 0), 0);
  const last = dayKeyToDate(week.days[6]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: spacing.xs }}>
      <AppText variant="callout" tone="secondary" tabular>
        {`${formatMonthDay(dayKeyToDate(week.days[0]))} – ${formatMonthDay(last)}`}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
        <AppText variant="caption" tone="secondary">
          Week
        </AppText>
        <Duration seconds={seconds} variant="callout" weight="600" />
      </View>
    </View>
  );
}

function WeekPage({
  week,
  tz,
  nowIso,
  today,
  selectedDay,
  onSelectDay,
}: {
  week: WeekRange;
  tz: string;
  nowIso: string;
  today: string;
  selectedDay: string;
  onSelectDay: (day: string) => void;
}) {
  const entries = useEntries({ from: week.start, to: week.end });
  const totals = totalsByDay(entries, tz, nowIso);
  return <WeekDays days={week.days} totals={totals} selectedDay={selectedDay} today={today} onSelectDay={onSelectDay} />;
}

function DayEntries({
  range,
  nowIso,
  day,
  onLongPress,
}: {
  range: { from: string; to: string };
  nowIso: string;
  day: string;
  onLongPress: (entry: EntryWithClient) => void;
}) {
  const entries = useEntries(range);

  if (!entries.length) {
    return (
      <EmptyState
        icon={{ sf: 'calendar.badge.plus', md: 'edit_calendar' }}
        title="Nothing logged"
        body="Forgot to start the clock? Add the hours by hand. Edits are noted on exports."
        action={
          <PrimaryButton
            title="Add entry"
            variant="secondary"
            block={false}
            icon={{ sf: 'plus', md: 'add' }}
            onPress={() => router.push({ pathname: '/entry-editor', params: { day } })}
          />
        }
      />
    );
  }

  const groups = new Map<string, Group>();
  // Oldest first reads like a day.
  for (const entry of [...entries].reverse()) {
    const seconds = elapsedSeconds(entry, nowIso);
    const cents = earningsFor(seconds, entry.hourlyRateCents);
    let g = groups.get(entry.clientId);
    if (!g) {
      g = { clientId: entry.clientId, name: entry.clientName, color: entry.clientColor, currency: entry.currency, seconds: 0, cents: 0, entries: [] };
      groups.set(entry.clientId, g);
    }
    g.seconds += seconds;
    g.cents += cents;
    g.entries.push({ entry, seconds, cents });
  }

  return (
    <View style={{ gap: spacing.lg }}>
      {[...groups.values()].map((g) => (
        <View key={g.clientId} style={{ gap: spacing.sm }}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs }}
            accessibilityRole="header"
          >
            <ClientBar color={g.color} style={{ height: spacing.md, alignSelf: 'center' }} />
            <AppText variant="body" weight="700" numberOfLines={1} style={{ flex: 1 }}>
              {g.name}
            </AppText>
            <Duration seconds={g.seconds} variant="callout" weight="600" />
            <Money cents={g.cents} currency={g.currency} variant="callout" tone="secondary" selectable={false} />
          </View>
          <ListGroup>
            {g.entries.map(({ entry, seconds, cents }) => (
              <EntryItem
                key={entry.id}
                entry={entry}
                seconds={seconds}
                earningsCents={cents}
                showClient={false}
                onLongPress={onLongPress}
              />
            ))}
          </ListGroup>
        </View>
      ))}
    </View>
  );
}

function HistoryLocked() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.accentSoft }}>
      <AppText variant="body" weight="600">
        Older than 30 days
      </AppText>
      <AppText variant="callout" tone="secondary">
        Free keeps the last 30 days of timesheets. Your older hours are still on this phone; Pro shows your full history.
      </AppText>
      <PrimaryButton title="See Pro" size="md" block={false} onPress={() => openPaywall('history')} />
    </View>
  );
}
