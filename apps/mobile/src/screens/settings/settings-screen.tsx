import { historyFloor, toCsv, toCsvRows } from '@punchcard/shared';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Alert, AppState, Linking, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ListGroup, ListRow } from '@/components/list-row';
import { openPaywall, ProBadge } from '@/components/pro-badge';
import { Screen } from '@/components/screen';
import { SectionFooter, SectionHeader } from '@/components/section-header';
import { Select } from '@/components/select';
import { Skeleton } from '@/components/skeleton';
import { SwatchPicker } from '@/components/swatch-picker';
import { showToast } from '@/components/toast';
import { currencyOptions, LINKS, NUDGE_HOURS } from '@/constants/app';
import { WEEKDAY_NAMES } from '@/constants/format';
import { authClient, useSession } from '@/data/auth-client';
import {
  clockOut,
  deleteClient,
  deleteEntry,
  deleteJob,
  deviceTimeZone,
  getRunningEntry,
  listClients,
  listEntries,
  listJobs,
  seedDemoData,
  setSetting,
  type Rounding,
  type RoundingMode,
} from '@/data';
import { setPreferences, usePreferences, type AppearancePreference } from '@/hooks/use-preferences';
import { useSettings } from '@/hooks/use-settings';
import { exportCsv } from '@/native/exports';
import * as haptics from '@/native/haptics';
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermissionStatus,
} from '@/native/notifications';
import { logOut, restorePurchases, showManageSubscriptions, usePlan } from '@/native/purchases';
import { ACCENTS, spacing, useTheme } from '@/theme';

import { pendingChanges, syncNow } from './sync-now';

const ROUNDING: { label: string; value: Rounding }[] = [
  { label: 'Exact', value: 'none' },
  { label: '1 min', value: '1' },
  { label: '6 min (0.1 h)', value: '6' },
  { label: '15 min', value: '15' },
];
const ROUNDING_MODE: { label: string; value: RoundingMode }[] = [
  { label: 'Nearest', value: 'nearest' },
  { label: 'Up', value: 'up' },
  { label: 'Down', value: 'down' },
];
const APPEARANCE: { label: string; value: AppearancePreference }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];
const EPOCH = '1970-01-01T00:00:00.000Z';
const FAR_FUTURE = '2100-01-01T00:00:00.000Z';

export function SettingsScreen() {
  const settings = useSettings();
  const prefs = usePreferences();
  const plan = usePlan();
  const { scheme } = useTheme();

  return (
    <Screen>
      <AccountSection />

      <Section title="Plan">
        <ListGroup>
          <ListRow title="Current plan" value={plan === 'pro' ? 'Pro' : 'Free'} trailing={plan === 'pro' ? <ProBadge /> : undefined} />
          {plan === 'free' ? <ListRow title="Upgrade to Pro" accent onPress={() => openPaywall('upgrade')} /> : null}
          <ListRow
            title="Restore purchases"
            onPress={async () => {
              const next = await restorePurchases().catch(() => null);
              if (next === 'pro') {
                haptics.success();
                showToast({ message: 'Pro restored' });
              } else showToast({ message: next ? 'No active Pro subscription found' : 'Could not reach the store' });
            }}
          />
          {plan === 'pro' ? <ListRow title="Manage subscription" onPress={() => void showManageSubscriptions()} /> : null}
        </ListGroup>
      </Section>

      <Section title="Time" footer="Rounding applies per entry on reports and exports; the clock itself is always exact.">
        <ListGroup>
          <ListRow
            title="Rounding"
            trailing={<Select accessibilityLabel="Rounding" value={settings.rounding} options={ROUNDING} onChange={(v) => setSetting('rounding', v)} />}
          />
          {settings.rounding !== 'none' ? (
            <ListRow
              title="Round"
              trailing={<Select accessibilityLabel="Rounding direction" value={settings.roundingMode} options={ROUNDING_MODE} onChange={(v) => setSetting('roundingMode', v)} />}
            />
          ) : null}
          <ListRow
            title="Week starts on"
            trailing={
              <Select
                accessibilityLabel="Week starts on"
                value={settings.weekStartsOn}
                options={WEEKDAY_NAMES.map((label, value) => ({ label, value }))}
                onChange={(v) => setSetting('weekStartsOn', v)}
              />
            }
          />
          <ListRow
            title="Default currency"
            trailing={
              <Select
                accessibilityLabel="Default currency"
                value={settings.currency}
                options={currencyOptions(settings.currency).map((c) => ({ label: c, value: c }))}
                onChange={(v) => setSetting('currency', v)}
              />
            }
          />
          <ListRow
            title="Still-on-the-clock nudge"
            trailing={
              <Select
                accessibilityLabel="Nudge after hours"
                value={settings.nudgeAfterHours}
                options={NUDGE_HOURS.map((h) => ({ label: `After ${h} h`, value: h }))}
                onChange={(v) => setSetting('nudgeAfterHours', v)}
              />
            }
          />
        </ListGroup>
      </Section>

      <NotificationsSection />

      <Section title="Appearance">
        <ListGroup>
          <View style={{ padding: spacing.md, gap: spacing.md }}>
            <AppText variant="body">Accent</AppText>
            <SwatchPicker
              swatches={ACCENTS.map((a) => ({ id: a.id, hex: a[scheme].accent, label: a.label }))}
              value={settings.accent ?? 'safety'}
              onChange={(id) => setSetting('accent', id)}
            />
          </View>
          <ListRow
            title="Theme"
            trailing={
              <Select accessibilityLabel="Theme" value={prefs.appearance} options={APPEARANCE} onChange={(v) => setPreferences({ appearance: v })} />
            }
          />
        </ListGroup>
      </Section>

      <Section title="Business" footer="Printed on branded PDF timesheets (Pro).">
        <ListGroup>
          <ListRow title="Business details" value={prefs.businessName || 'Not set'} onPress={() => router.push('/settings/business')} />
        </ListGroup>
      </Section>

      <DataSection />

      <Section title="About">
        <ListGroup>
          <ListRow title="Version" value={Constants.expoConfig?.version ?? '–'} />
          <ListRow title="Privacy policy" onPress={() => void Linking.openURL(LINKS.privacy)} />
          <ListRow title="Support" onPress={() => void Linking.openURL(LINKS.support)} />
          <ListRow title="Terms" onPress={() => void Linking.openURL(LINKS.terms)} />
        </ListGroup>
      </Section>
    </Screen>
  );
}

function Section({ title, footer, children }: { title: string; footer?: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionHeader title={title} />
      {children}
      {footer ? <SectionFooter>{footer}</SectionFooter> : null}
    </View>
  );
}

function AccountSection() {
  const session = useSession();
  const plan = usePlan();
  const [pending, setPending] = useState(() => pendingChanges());
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const user = session.data?.user;

  useFocusEffect(
    useCallback(() => {
      setPending(pendingChanges());
    }, []),
  );

  if (session.isPending && !session.data) {
    return (
      <Section title="Account">
        <ListGroup>
          <View style={{ padding: spacing.md, gap: spacing.sm }}>
            <Skeleton width="50%" height={18} />
            <Skeleton width="70%" height={14} />
          </View>
        </ListGroup>
      </Section>
    );
  }

  if (!user) {
    return (
      <Section title="Account" footer="Optional. Without an account everything stays on this phone and works offline.">
        <ListGroup>
          <ListRow title="Sign in or create account" subtitle="Back up and sync across devices" onPress={() => router.push('/settings/account')} />
        </ListGroup>
      </Section>
    );
  }

  const sync = async () => {
    if (plan !== 'pro') {
      openPaywall('sync');
      return;
    }
    setSyncing(true);
    const result = await syncNow();
    setSyncing(false);
    setPending(pendingChanges());
    if (result.ok) {
      haptics.success();
      setLastSync(new Date().toISOString());
      showToast({ message: result.accepted ? `Synced ${result.accepted} changes` : 'Everything is up to date' });
    } else {
      haptics.warning();
      showToast({ message: result.message });
    }
  };

  return (
    <Section title="Account">
      <ListGroup>
        <ListRow title={user.name || user.email} subtitle={user.name ? user.email : undefined} />
        <ListRow
          title={syncing ? 'Syncing…' : 'Sync now'}
          subtitle={
            plan !== 'pro'
              ? 'Multi-device sync is part of Pro'
              : `${pending} ${pending === 1 ? 'change' : 'changes'} waiting${lastSync ? ' · synced just now' : ''}`
          }
          trailing={plan !== 'pro' ? <ProBadge reason="sync" /> : undefined}
          disabled={syncing}
          onPress={() => void sync()}
        />
        <ListRow
          title="Sign out"
          destructive
          onPress={() =>
            Alert.alert('Sign out?', 'Your time stays on this phone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Sign out',
                style: 'destructive',
                onPress: async () => {
                  await authClient.signOut().catch(() => undefined);
                  await logOut().catch(() => undefined);
                  showToast({ message: 'Signed out' });
                },
              },
            ])
          }
        />
      </ListGroup>
    </Section>
  );
}

const permissionLabel = (p: NotificationPermissionStatus | null) =>
  !p ? 'Checking…' : p.status === 'granted' ? 'On' : p.status === 'denied' ? 'Off' : 'Not set up';

function NotificationsSection() {
  const [permission, setPermission] = useState<NotificationPermissionStatus | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const refresh = () =>
        getNotificationPermission()
          .then((p) => {
            if (alive) setPermission(p);
          })
          .catch(() => undefined);
      refresh();
      // Coming back from the system Settings app.
      const sub = AppState.addEventListener('change', (s) => {
        if (s === 'active') refresh();
      });
      return () => {
        alive = false;
        sub.remove();
      };
    }, []),
  );

  const act = async () => {
    if (permission?.status === 'undetermined' && permission.canAskAgain) {
      setPermission(await requestNotificationPermission());
    } else {
      await Linking.openSettings();
    }
  };

  return (
    <Section
      title="Notifications"
      footer="Used for the still-on-the-clock nudge, Lock Screen Stop and Break buttons, and job-site reminders."
    >
      <ListGroup>
        <ListRow
          title="Notifications"
          value={permissionLabel(permission)}
          onPress={permission && permission.status !== 'granted' ? () => void act() : undefined}
          accessibilityHint={permission?.status === 'undetermined' ? 'Asks for permission' : 'Opens system settings'}
        />
        {permission?.status === 'granted' ? null : (
          <ListRow title={permission?.status === 'undetermined' ? 'Turn on notifications' : 'Open system settings'} accent onPress={() => void act()} />
        )}
      </ListGroup>
    </Section>
  );
}

function DataSection() {
  const settings = useSettings();
  const plan = usePlan();
  const [busy, setBusy] = useState(false);

  const exportAll = async () => {
    const now = new Date().toISOString();
    const from = historyFloor(plan, now) ?? EPOCH;
    const entries = listEntries({ from, to: FAR_FUTURE });
    if (!entries.length) {
      showToast({ message: 'No entries to export yet' });
      return;
    }
    setBusy(true);
    try {
      const clients = listClients({ includeArchived: true });
      const jobs = clients.flatMap((c) => listJobs(c.id, { includeArchived: true }));
      const text = toCsv(toCsvRows(entries, clients, settings, { tz: deviceTimeZone(), jobs, now }));
      const res = await exportCsv(text, 'Punchcard all entries');
      if (res.shared) haptics.success();
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Export failed' });
    } finally {
      setBusy(false);
    }
  };

  const wipe = () =>
    Alert.alert(
      'Delete all data?',
      'Every client, job and time entry on this phone is removed. Export first if you need a copy. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => {
            if (getRunningEntry()) clockOut();
            for (const e of listEntries({ from: EPOCH, to: FAR_FUTURE })) deleteEntry(e.id);
            for (const c of listClients({ includeArchived: true })) {
              for (const j of listJobs(c.id, { includeArchived: true })) deleteJob(j.id);
              deleteClient(c.id);
            }
            haptics.warning();
            showToast({ message: 'All data deleted' });
          },
        },
      ],
    );

  return (
    <Section title="Data" footer={plan === 'free' ? 'Free exports cover the last 30 days.' : undefined}>
      <ListGroup>
        <ListRow title={busy ? 'Exporting…' : 'Export all entries (CSV)'} disabled={busy} onPress={() => void exportAll()} />
        {__DEV__ ? (
          <ListRow
            title="Load demo data"
            subtitle="Developer builds only"
            onPress={() => {
              seedDemoData({ withRunning: true });
              showToast({ message: 'Demo clients and two weeks of entries added' });
            }}
          />
        ) : null}
        <ListRow title="Delete all data" destructive onPress={wipe} />
      </ListGroup>
    </Section>
  );
}
