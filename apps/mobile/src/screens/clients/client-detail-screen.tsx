import { elapsedSeconds, weekRange } from '@punchcard/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ClientBar } from '@/components/client-bar';
import { Duration } from '@/components/duration';
import { EmptyState } from '@/components/empty-state';
import { TextField } from '@/components/form-field';
import { HeaderActions } from '@/components/header-actions';
import { ListGroup, ListRow } from '@/components/list-row';
import { Money } from '@/components/money';
import { OverflowMenu } from '@/components/overflow-menu';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SectionFooter, SectionHeader } from '@/components/section-header';
import { showToast } from '@/components/toast';
import { money } from '@/constants/format';
import {
  archiveJob,
  createJob,
  dayRange,
  deleteJob,
  restoreJob,
  deviceTimeZone,
  earningsFor,
  renameJob,
  unarchiveJob,
  type Job,
} from '@/data';
import { useClient, useJobs } from '@/hooks/use-clients';
import { useEntries } from '@/hooks/use-entries';
import { useNowSeconds } from '@/hooks/use-now';
import { useSettings } from '@/hooks/use-settings';
import * as haptics from '@/native/haptics';
import { usePlan } from '@/native/purchases';
import { startClock } from '@/screens/clock/clock-actions';
import { overline, radius, spacing, useTheme } from '@/theme';

import { archive, confirmDelete, editClient, unarchive } from './client-actions';

const DAY_MS = 86_400_000;

export function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useClient(id);
  const jobs = useJobs(client?.id);
  const plan = usePlan();
  const { weekStartsOn } = useSettings();
  const { colors } = useTheme();
  const [newJob, setNewJob] = useState('');
  const nowSec = useNowSeconds(false);
  const nowIso = new Date(nowSec * 1000).toISOString();
  const week = weekRange(nowIso, weekStartsOn, deviceTimeZone());
  const monthFrom = dayRange(new Date(nowSec * 1000 - 30 * DAY_MS)).from;
  const recent = useEntries({ from: monthFrom, to: week.end }, { clientId: id });

  if (!client || client.deletedAt) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Client' }} />
        <EmptyState icon={{ sf: 'person.crop.circle.badge.questionmark', md: 'person_off' }} title="Client not found" body="It may have been deleted." />
      </Screen>
    );
  }

  const weekSeconds = recent
    .filter((e) => e.startedAt >= week.start)
    .reduce((n, e) => n + elapsedSeconds(e, nowIso), 0);
  const monthSeconds = recent.reduce((n, e) => n + elapsedSeconds(e, nowIso), 0);
  const running = recent.find((e) => !e.endedAt);
  const archived = !!client.archivedAt;

  const addJob = () => {
    const name = newJob.trim();
    if (!name) return;
    createJob(client.id, name);
    haptics.tapLight();
    setNewJob('');
  };

  return (
    <>
      <Stack.Screen options={{ title: client.name }} />
      <HeaderActions actions={[{ key: 'edit', label: `Edit ${client.name}`, sf: 'pencil', md: 'edit', onPress: () => editClient(client) }]} />
      <Screen>
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.md,
            padding: spacing.md,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            backgroundColor: colors.surfaceElevated,
          }}
        >
          <ClientBar color={client.color} />
          <View style={{ flex: 1, gap: spacing.md }}>
            <View>
              <AppText variant="title" selectable>
                {client.name}
              </AppText>
              {client.address ? (
                <AppText variant="callout" tone="secondary" selectable>
                  {client.address}
                </AppText>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.lg }}>
              <Figure label="Rate">
                <AppText variant="headline" tabular>{`${money(client.hourlyRateCents, client.currency)}/h`}</AppText>
              </Figure>
              <Figure label="This week">
                <Duration seconds={weekSeconds} variant="headline" />
              </Figure>
              <Figure label="30 days">
                <Money cents={earningsFor(monthSeconds, client.hourlyRateCents)} currency={client.currency} variant="headline" />
              </Figure>
            </View>
            {client.geofenceRadiusM ? (
              <AppText variant="caption" tone="secondary">
                {client.lat != null ? `Job-site reminders within ${client.geofenceRadiusM} m` : `Job-site radius ${client.geofenceRadiusM} m (site not pinned yet)`}
              </AppText>
            ) : null}
          </View>
        </View>

        {archived ? (
          <PrimaryButton title="Unarchive client" variant="secondary" size="lg" icon={{ sf: 'tray.and.arrow.up', md: 'unarchive' }} onPress={() => unarchive(client, plan)} />
        ) : running ? (
          <PrimaryButton title="On the clock now" variant="secondary" size="lg" icon={{ sf: 'clock.fill', md: 'schedule' }} onPress={() => router.navigate('/clock')} />
        ) : (
          <PrimaryButton
            title={`Start ${client.name}`}
            size="lg"
            icon={{ sf: 'play.fill', md: 'play_arrow' }}
            onPress={() => {
              startClock(client.id);
              router.navigate('/clock');
            }}
          />
        )}

        <View style={{ gap: spacing.sm }}>
          <SectionHeader title="Jobs" />
          <ListGroup>
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <TextField
                  value={newJob}
                  onChangeText={setNewJob}
                  placeholder="New job, e.g. Tiling"
                  accessibilityLabel="New job name"
                  returnKeyType="done"
                  onSubmitEditing={addJob}
                  maxLength={120}
                  style={{ backgroundColor: colors.surfaceSunken }}
                />
              </View>
              <PrimaryButton title="Add" block={false} disabled={!newJob.trim()} onPress={addJob} />
            </View>
          </ListGroup>
          <SectionFooter>Jobs are optional labels under a client (a room, a phase, a ticket). They show on timesheets.</SectionFooter>
        </View>

        <View style={{ gap: spacing.sm }}>
          <SectionHeader title="Manage" />
          <ListGroup>
            <ListRow title="Edit details" onPress={() => editClient(client)} />
            {archived ? null : (
              <ListRow
                title="Archive"
                subtitle="Hide from pickers; history stays on timesheets"
                onPress={() => {
                  if (archive(client)) router.back();
                }}
              />
            )}
            <ListRow title="Delete client" destructive onPress={() => confirmDelete(client, () => router.back())} />
          </ListGroup>
        </View>
      </Screen>
    </>
  );
}

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="caption" tone="secondary" style={overline}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

function JobRow({ job }: { job: Job }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(job.name);
  const { colors } = useTheme();

  if (editing) {
    const save = () => {
      const next = name.trim();
      if (next && next !== job.name) renameJob(job.id, next);
      setEditing(false);
    };
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <TextField
            value={name}
            onChangeText={setName}
            autoFocus
            accessibilityLabel={`Rename ${job.name}`}
            returnKeyType="done"
            onSubmitEditing={save}
            maxLength={120}
            style={{ backgroundColor: colors.surfaceSunken }}
          />
        </View>
        <PrimaryButton title="Save" block={false} onPress={save} />
      </View>
    );
  }

  return (
    <ListRow
      title={job.name}
      trailing={
        <OverflowMenu
          accessibilityLabel={`Actions for ${job.name}`}
          actions={[
            { id: 'rename', title: 'Rename', sf: 'pencil', onPress: () => setEditing(true) },
            {
              id: 'archive',
              title: 'Archive',
              sf: 'archivebox',
              onPress: () => {
                archiveJob(job.id);
                showToast({ message: `Archived ${job.name}`, actionLabel: 'Undo', onAction: () => unarchiveJob(job.id) });
              },
            },
            {
              id: 'delete',
              title: 'Delete',
              sf: 'trash',
              destructive: true,
              // Soft delete with an undo toast, like entries (entries keep the job name).
              onPress: () => {
                deleteJob(job.id);
                haptics.warning();
                showToast({ message: `Deleted ${job.name}`, actionLabel: 'Undo', onAction: () => restoreJob(job.id) });
              },
            },
          ]}
        />
      }
    />
  );
}
