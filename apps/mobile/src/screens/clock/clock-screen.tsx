import { elapsedSeconds } from '@punchcard/shared';
import { Link, router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { ClientBar } from '@/components/client-bar';
import { Duration } from '@/components/duration';
import { EmptyState } from '@/components/empty-state';
import { EntryRow } from '@/components/entry-row';
import { Icon } from '@/components/icon';
import { ListGroup } from '@/components/list-row';
import { Money } from '@/components/money';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { showToast } from '@/components/toast';
import { compactDuration, formatDayShort, money } from '@/constants/format';
import { dayRange, earningsFor, getClient, type Client, type EntryWithClient } from '@/data';
import { useClients } from '@/hooks/use-clients';
import { useEntries, useRecentClientIds } from '@/hooks/use-entries';
import { useNowSeconds } from '@/hooks/use-now';
import { useSettings } from '@/hooks/use-settings';
import { useTodayTotals } from '@/hooks/use-today-totals';
import * as haptics from '@/native/haptics';
import { easing, motion, overline, radius, spacing, touchTarget, useTheme } from '@/theme';

import { startClock, stopClock } from './clock-actions';
import { ClockButton } from './clock-button';
import { RunningCard } from './running-card';

const LAYOUT = LinearTransition.duration(motion.duration.base).easing(easing.standard);
const DAY_MS = 86_400_000;

type QuickStart = { client: Client; jobId: string | null; jobName: string | null };

/** Widget "Start" deep link: `punchcard://clock?start=<clientId>`. */
function useStartDeepLink() {
  const { start } = useLocalSearchParams<{ start?: string }>();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!start) {
      handled.current = null;
      return;
    }
    if (handled.current === start) return;
    handled.current = start;
    const client = getClient(start);
    if (client && !client.archivedAt && !client.deletedAt) {
      const t = startClock(start, null, 'widget');
      if (t.events.length) showToast({ message: `Clocked in · ${client.name}` });
    } else {
      haptics.warning();
      showToast({ message: "That client isn't available any more" });
    }
    router.setParams({ start: undefined });
  }, [start]);
}

export function ClockScreen() {
  useStartDeepLink();
  // Non-ticking "now": refreshed on every render, which is enough for day boundaries.
  const now = new Date(useNowSeconds(false) * 1000);
  const today = dayRange(now);
  const todays = useEntries(today);
  const recentIds = useRecentClientIds(3);
  const clients = useClients();
  // Last month of entries tells us each recent client's last job.
  const recentRange = { from: dayRange(new Date(now.getTime() - 30 * DAY_MS)).from, to: today.to };
  const recentEntries = useEntries(recentRange);

  const runningEntry = todays.find((e) => !e.endedAt) ?? null;
  const finished = todays.filter((e) => !!e.endedAt);

  const quick: QuickStart[] = recentIds
    .map((id) => clients.find((c) => c.id === id))
    .filter((c): c is Client => !!c)
    .map((client) => {
      const last = recentEntries.find((e) => e.clientId === client.id);
      return { client, jobId: last?.jobId ?? null, jobName: last?.jobName ?? null };
    });
  const primary = quick[0] ?? null;

  const onClockPress = () => {
    if (runningEntry) stopClock();
    else if (primary) startClock(primary.client.id, primary.jobId);
    else if (clients.length) router.push({ pathname: '/client-picker', params: { mode: 'start' } });
    else router.push('/client-editor');
  };

  return (
    <>
      <Stack.Screen options={{ title: formatDayShort(now) }} />
      <Screen>
        {runningEntry ? (
          <RunningCard />
        ) : (
          <Animated.View layout={LAYOUT} style={{ gap: spacing.xs, paddingTop: spacing.sm }}>
            <AppText variant="title" accessibilityRole="header">
              Ready to work
            </AppText>
            <AppText variant="callout" tone="secondary">
              {clients.length === 0
                ? 'Add a client to start tracking billable time.'
                : primary
                  ? 'One tap starts the clock. It keeps running on your Lock Screen.'
                  : 'Pick a client to start the clock.'}
            </AppText>
          </Animated.View>
        )}

        {clients.length === 0 && !runningEntry ? (
          <EmptyState
            icon={{ sf: 'person.crop.circle.badge.plus', md: 'person_add' }}
            title="No clients yet"
            body="Clients carry your hourly rate and colour, so every hour lands on the right timesheet."
            action={<PrimaryButton title="Add client" size="lg" onPress={() => router.push('/client-editor')} />}
          />
        ) : (
          <Animated.View layout={LAYOUT}>
            <ClockButton
              running={!!runningEntry}
              startLabel={primary ? 'Start' : 'Choose client'}
              startCaption={primary ? [primary.client.name, primary.jobName].filter(Boolean).join(' · ') : undefined}
              accessibilityHint={runningEntry ? 'Stops the clock and saves the entry' : undefined}
              onPress={onClockPress}
            />
          </Animated.View>
        )}

        {!runningEntry && quick.length > 0 ? (
          <Animated.View layout={LAYOUT} style={{ gap: spacing.sm }}>
            {quick.length > 1 ? <SectionHeader title="Quick start" /> : null}
            {quick.slice(1).map((q) => (
              <QuickStartCard key={q.client.id} item={q} />
            ))}
            <PrimaryButton
              title="Choose another client"
              variant="secondary"
              size="lg"
              icon={{ sf: 'list.bullet', md: 'list' }}
              onPress={() => router.push({ pathname: '/client-picker', params: { mode: 'start' } })}
            />
          </Animated.View>
        ) : null}

        <Animated.View layout={LAYOUT} style={{ gap: spacing.sm }}>
          <SectionHeader title="Earlier today" />
          {finished.length ? (
            <ListGroup>
              {finished.map((e) => (
                <EntryLink key={e.id} entry={e} />
              ))}
            </ListGroup>
          ) : (
            <AppText variant="callout" tone="tertiary" style={{ paddingHorizontal: spacing.md }}>
              Finished jobs from today show up here.
            </AppText>
          )}
        </Animated.View>

        <TodayFooter />
      </Screen>
    </>
  );
}

function QuickStartCard({ item }: { item: QuickStart }) {
  const { colors } = useTheme();
  const { client, jobId, jobName } = item;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Start ${client.name}${jobName ? `, ${jobName}` : ''}, ${money(client.hourlyRateCents, client.currency)} per hour`}
      onPress={() => startClock(client.id, jobId)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: touchTarget + spacing.lg,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        backgroundColor: pressed ? colors.surfaceSunken : colors.surfaceElevated,
      })}
    >
      <ClientBar color={client.color} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" weight="600" numberOfLines={1}>
          {client.name}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {[jobName, `${money(client.hourlyRateCents, client.currency)}/h`].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      <View
        style={{
          width: touchTarget,
          height: touchTarget,
          borderRadius: radius.pill,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon sf="play.fill" md="play_arrow" size={18} color={colors.accentText} />
      </View>
    </Pressable>
  );
}

function EntryLink({ entry }: { entry: EntryWithClient }) {
  const seconds = elapsedSeconds(entry); // finished entries only
  return (
    <Link href={{ pathname: '/entry-editor', params: { id: entry.id } }} asChild>
      <Pressable accessibilityHint="Opens the entry to edit">
        {({ pressed }) => (
          <EntryRow entry={entry} seconds={seconds} earningsCents={earningsFor(seconds, entry.hourlyRateCents)} pressed={pressed} />
        )}
      </Pressable>
    </Link>
  );
}

/** Today's totals; ticks while the clock runs. */
function TodayFooter() {
  const today = useTodayTotals();
  const { currency: defaultCurrency } = useSettings();
  const { colors } = useTheme();
  const currency = today.byClient[0]?.currency ?? defaultCurrency;
  const mixed = new Set(today.byClient.map((c) => c.currency)).size > 1;
  return (
    <View
      style={{
        flexDirection: 'row',
        borderRadius: radius.md,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceSunken,
        padding: spacing.md,
        gap: spacing.md,
      }}
      accessible
      accessibilityLabel={`Today: ${compactDuration(today.totalSeconds)} worked, ${today.entryCount} ${today.entryCount === 1 ? 'entry' : 'entries'}${mixed ? '' : `, ${money(today.earningsCents, currency)} earned`}`}
    >
      <Stat label="Today">
        <Duration seconds={today.totalSeconds} variant="headline" />
      </Stat>
      {mixed ? null : (
        <Stat label="Earned">
          <Money cents={today.earningsCents} currency={currency} variant="headline" selectable={false} />
        </Stat>
      )}
      <Stat label="Entries">
        <AppText variant="headline" tabular>
          {String(today.entryCount)}
        </AppText>
      </Stat>
    </View>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <AppText variant="caption" tone="secondary" style={overline}>
        {label}
      </AppText>
      {children}
    </View>
  );
}
