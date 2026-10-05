import { canAddClient } from '@punchcard/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ClientBar } from '@/components/client-bar';
import { EmptyState } from '@/components/empty-state';
import { FormSheet } from '@/components/form-sheet';
import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list-row';
import { PrimaryButton } from '@/components/primary-button';
import { openPaywall } from '@/components/pro-badge';
import { showToast } from '@/components/toast';
import { money } from '@/constants/format';
import { dayRange, switchJob, type Client } from '@/data';
import { useClients, useJobs } from '@/hooks/use-clients';
import { useEntries } from '@/hooks/use-entries';
import * as haptics from '@/native/haptics';
import { usePlan } from '@/native/purchases';
import { radius, spacing, touchTarget, useTheme } from '@/theme';

import { startClock } from './clock-actions';

/** Pick a client (and optionally a job) to start, or to switch the running entry to. */
export function ClientPickerSheet() {
  const { mode } = useLocalSearchParams<{ mode?: 'start' | 'switch' }>();
  const switching = mode === 'switch';
  const { colors } = useTheme();
  const clients = useClients();
  const plan = usePlan();
  const running = useEntries(dayRange()).find((e) => !e.endedAt) ?? null;

  const choose = (client: Client, jobId: string | null, jobName: string | null) => {
    if (running && (switching || running.clientId !== client.id || (running.jobId ?? null) !== jobId)) {
      const t = switchJob({ clientId: client.id, jobId });
      if (t.events.length) {
        haptics.clockIn();
        showToast({ message: `Switched to ${client.name}${jobName ? ` · ${jobName}` : ''}` });
      }
    } else {
      startClock(client.id, jobId);
    }
    router.back();
  };

  const addClient = () => {
    if (canAddClient(plan, clients.length)) router.push('/client-editor');
    else {
      haptics.warning();
      openPaywall('clients');
    }
  };

  return (
    <FormSheet title={switching ? 'Switch job' : 'Start the clock'}>
      {clients.length === 0 ? (
        <EmptyState
          icon={{ sf: 'person.crop.circle.badge.plus', md: 'person_add' }}
          title="No clients yet"
          body="Add a client with an hourly rate to start tracking."
          action={<PrimaryButton title="Add client" onPress={addClient} />}
        />
      ) : (
        <>
          <AppText variant="callout" tone="secondary">
            {switching
              ? 'The current entry ends now and the new one starts at the same instant.'
              : 'Tap a client to start. Jobs are optional labels under a client.'}
          </AppText>
          <View style={{ gap: spacing.sm }}>
            {clients.map((c) => (
              <ClientChoice
                key={c.id}
                client={c}
                current={running?.clientId === c.id ? (running.jobId ?? null) : undefined}
                onChoose={choose}
              />
            ))}
          </View>
          <ListGroup>
            <ListRow
              title="New client"
              accent
              leading={<Icon sf="plus.circle.fill" md="add_circle" size={22} color={colors.accentText} />}
              onPress={addClient}
            />
          </ListGroup>
        </>
      )}
    </FormSheet>
  );
}


function ClientChoice({
  client,
  current,
  onChoose,
}: {
  client: Client;
  /** Job id currently running for this client (`null` = no job), undefined when not running. */
  current: string | null | undefined;
  onChoose: (client: Client, jobId: string | null, jobName: string | null) => void;
}) {
  const { colors } = useTheme();
  const jobs = useJobs(client.id);
  const isCurrent = current !== undefined;
  return (
    <View
      style={{
        borderRadius: radius.md,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceElevated,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${client.name}, ${money(client.hourlyRateCents, client.currency)} per hour${isCurrent && current === null ? ', running now' : ''}`}
        onPress={() => onChoose(client, null, null)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          minHeight: touchTarget + spacing.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: pressed ? colors.surfaceSunken : 'transparent',
        })}
      >
        <ClientBar color={client.color} />
        <View style={{ flex: 1 }}>
          <AppText variant="body" weight="600" numberOfLines={1}>
            {client.name}
          </AppText>
          <AppText variant="caption" tone="secondary" tabular>
            {`${money(client.hourlyRateCents, client.currency)}/h`}
          </AppText>
        </View>
        {isCurrent && current === null ? (
          <AppText variant="caption" weight="700" tone="accent">
            Running
          </AppText>
        ) : (
          <Icon sf="play.circle.fill" md="play_circle" size={28} color={colors.accentText} />
        )}
      </Pressable>
      {jobs.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
          {jobs.map((j) => {
            const active = current === j.id;
            return (
              <Pressable
                key={j.id}
                accessibilityRole="button"
                accessibilityLabel={`${client.name}, job ${j.name}${active ? ', running now' : ''}`}
                onPress={() => onChoose(client, j.id, j.name)}
                style={({ pressed }) => ({
                  minHeight: touchTarget,
                  paddingHorizontal: spacing.md,
                  justifyContent: 'center',
                  borderRadius: radius.pill,
                  backgroundColor: active ? colors.accent : pressed ? colors.border : colors.surfaceSunken,
                })}
              >
                <AppText variant="callout" weight="600" style={{ color: active ? colors.onAccent : colors.text }}>
                  {j.name}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
