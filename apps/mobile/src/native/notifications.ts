import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Identifiers

export const CATEGORY_RUNNING = 'running';
export const CATEGORY_GEOFENCE = 'geofence';

/**
 * Android channels. `running` is shared with expo-live-updates (plugin `channelId`), which
 * creates it at DEFAULT importance on start-up; we lower it to LOW (allowed for existing
 * channels) so the per-minute timer refresh never chimes.
 */
export const CHANNEL_NUDGES = 'nudges';
export const CHANNEL_RUNNING_STATUS = 'running';

export const ACTION_STOP = 'stop';
export const ACTION_BREAK = 'break';
export const ACTION_START = 'start';

const RUNNING_STATUS_ID = 'running-status';
const stillClockedInId = (entryId: string) => `still-clocked-in:${entryId}`;

export type NotificationKind = 'running-status' | 'still-clocked-in' | 'geofence';

/** Shape of `content.data` on every notification Punchcard posts. */
export type PunchcardNotificationData = {
  kind: NotificationKind;
  entryId?: string;
  clientId?: string;
};

export type NotificationAction = 'stop' | 'break' | 'start' | 'open';

export type NotificationActionEvent = {
  action: NotificationAction;
  kind: NotificationKind | null;
  entryId?: string;
  clientId?: string;
};

// ---------------------------------------------------------------------------
// Setup

let setupPromise: Promise<void> | null = null;

/**
 * Idempotent: foreground presentation handler, Android channels and the `running` /
 * `geofence` action categories. Call once at startup (root layout) and before posting.
 */
export function setupNotifications(): Promise<void> {
  if (!setupPromise) {
    Notifications.setNotificationHandler({
      handleNotification: async (n) => {
        const data = n.request.content.data as Partial<PunchcardNotificationData> | undefined;
        // The ongoing status notification should not pop a banner while the app is open.
        const quiet = data?.kind === 'running-status';
        return { shouldShowBanner: !quiet, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false };
      },
    });
    setupPromise = (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL_NUDGES, {
          name: 'Reminders',
          description: 'Still clocked in, arrived at / left a job site',
          importance: Notifications.AndroidImportance.HIGH,
        });
        await Notifications.setNotificationChannelAsync(CHANNEL_RUNNING_STATUS, {
          name: 'Running timer',
          description: 'Ongoing notification while you are on the clock',
          importance: Notifications.AndroidImportance.LOW,
          sound: null,
          vibrationPattern: null,
          enableVibrate: false,
          showBadge: false,
        });
      }
      await Notifications.setNotificationCategoryAsync(CATEGORY_RUNNING, [
        { identifier: ACTION_STOP, buttonTitle: 'Stop', options: { opensAppToForeground: true, isDestructive: true } },
        { identifier: ACTION_BREAK, buttonTitle: 'Break', options: { opensAppToForeground: true } },
      ]);
      await Notifications.setNotificationCategoryAsync(CATEGORY_GEOFENCE, [
        { identifier: ACTION_START, buttonTitle: 'Start', options: { opensAppToForeground: true } },
        { identifier: ACTION_STOP, buttonTitle: 'Stop', options: { opensAppToForeground: true, isDestructive: true } },
      ]);
    })().catch((error) => {
      setupPromise = null;
      throw error;
    });
  }
  return setupPromise;
}

// ---------------------------------------------------------------------------
// Permission

export type NotificationPermissionStatus = {
  /** `granted` also covers iOS provisional/ephemeral authorisation. */
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
};

function toStatus(p: Notifications.NotificationPermissionsStatus): NotificationPermissionStatus {
  const iosStatus = p.ios?.status;
  const granted =
    p.granted ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL;
  return {
    status: granted ? 'granted' : p.status === 'undetermined' ? 'undetermined' : 'denied',
    canAskAgain: p.canAskAgain,
  };
}

export async function getNotificationPermission(): Promise<NotificationPermissionStatus> {
  return toStatus(await Notifications.getPermissionsAsync());
}

/** Shows the OS prompt when still possible; otherwise returns the current status (UI links to Settings). */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  await setupNotifications(); // Android 13+: a channel must exist before the prompt.
  const current = await getNotificationPermission();
  if (current.status === 'granted' || !current.canAskAgain) return current;
  return toStatus(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    }),
  );
}

// ---------------------------------------------------------------------------
// "Still clocked in" nudge

/** Schedules the local nudge (replacing any previous one). `at` is usually `nudgeAt(entry, hours)`. */
export async function scheduleStillClockedIn(
  entryId: string,
  at: Date | string,
  opts: { clientName?: string } = {},
): Promise<string | null> {
  const date = typeof at === 'string' ? new Date(at) : at;
  await cancelStillClockedIn();
  if (date.getTime() <= Date.now()) return null;
  await setupNotifications();
  const data: PunchcardNotificationData = { kind: 'still-clocked-in', entryId };
  return Notifications.scheduleNotificationAsync({
    identifier: stillClockedInId(entryId),
    content: {
      title: 'Still on the clock?',
      body: opts.clientName ? `${opts.clientName} has been running for a long time.` : 'Your timer is still running.',
      categoryIdentifier: CATEGORY_RUNNING,
      data,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_NUDGES },
  });
}

/** Cancels the nudge for `entryId`, or every still-clocked-in nudge when omitted. */
export async function cancelStillClockedIn(entryId?: string): Promise<void> {
  if (entryId) {
    await Notifications.cancelScheduledNotificationAsync(stillClockedInId(entryId));
    return;
  }
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith('still-clocked-in:'))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

// ---------------------------------------------------------------------------
// Geofence nudge (posted by the background task)

export async function presentGeofenceNudge(input: {
  kind: 'arrived-start' | 'left-still-running';
  clientId: string;
  clientName: string;
  entryId?: string;
}): Promise<string> {
  await setupNotifications();
  const arrived = input.kind === 'arrived-start';
  const data: PunchcardNotificationData = { kind: 'geofence', clientId: input.clientId, entryId: input.entryId };
  return Notifications.scheduleNotificationAsync({
    identifier: `geofence:${input.clientId}`,
    content: {
      title: arrived ? `Arrived at ${input.clientName}` : `Left ${input.clientName}`,
      body: arrived ? 'Start the clock?' : 'Still on the clock?',
      categoryIdentifier: CATEGORY_GEOFENCE,
      data,
    },
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL_NUDGES } : null,
  });
}

// ---------------------------------------------------------------------------
// Ongoing running notification (Android < 16 fallback used by live-status)

export async function presentRunningStatusNotification(input: {
  entryId: string;
  title: string;
  body: string;
}): Promise<void> {
  await setupNotifications();
  const data: PunchcardNotificationData = { kind: 'running-status', entryId: input.entryId };
  await Notifications.scheduleNotificationAsync({
    identifier: RUNNING_STATUS_ID, // same id → replaces in place on update
    content: {
      title: input.title,
      body: input.body,
      sticky: true,
      autoDismiss: false,
      sound: false,
      priority: Notifications.AndroidNotificationPriority.LOW,
      categoryIdentifier: CATEGORY_RUNNING,
      data,
    },
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL_RUNNING_STATUS } : null,
  });
}

export async function dismissRunningStatusNotification(): Promise<void> {
  await Notifications.dismissNotificationAsync(RUNNING_STATUS_ID).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Expo push token

export type PushRegistration =
  | { ok: true; token: string }
  | { ok: false; reason: 'not-a-device' | 'permission-denied' | 'missing-project-id' | 'error'; message?: string };

/** EAS project id from app config (`extra.eas.projectId`), or null before `eas init`. */
export function getEasProjectId(): string | null {
  const fromExtra = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  return fromExtra ?? Constants.easConfig?.projectId ?? null;
}

/** Gets the Expo push token for the backend `devices` route. Never throws. */
export async function registerForPushNotifications(): Promise<PushRegistration> {
  try {
    if (!Device.isDevice) return { ok: false, reason: 'not-a-device' };
    const projectId = getEasProjectId();
    if (!projectId) {
      console.warn('[notifications] extra.eas.projectId is missing; run `eas init` to enable push.');
      return { ok: false, reason: 'missing-project-id' };
    }
    const permission = await requestNotificationPermission();
    if (permission.status !== 'granted') return { ok: false, reason: 'permission-denied' };
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { ok: true, token: data };
  } catch (error) {
    return { ok: false, reason: 'error', message: error instanceof Error ? error.message : String(error) };
  }
}

// ---------------------------------------------------------------------------
// Responses (action buttons and taps)

function toActionEvent(response: Notifications.NotificationResponse): NotificationActionEvent | null {
  const data = (response.notification.request.content.data ?? {}) as Partial<PunchcardNotificationData>;
  const kind = data.kind ?? null;
  const id = response.actionIdentifier;
  const action: NotificationAction | null =
    id === ACTION_STOP || id === ACTION_BREAK || id === ACTION_START
      ? id
      : id === Notifications.DEFAULT_ACTION_IDENTIFIER
        ? 'open'
        : null;
  if (!action) return null;
  return { action, kind, entryId: data.entryId, clientId: data.clientId };
}

/** Fires for action-button presses and taps on Punchcard notifications. Returns unsubscribe. */
export function addNotificationActionListener(listener: (event: NotificationActionEvent) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const event = toActionEvent(response);
    if (event) listener(event);
  });
  return () => sub.remove();
}

/**
 * The response that cold-launched the app (e.g. "Stop" pressed while the app was killed),
 * consumed once so it is not handled twice.
 */
export async function consumeLaunchNotificationAction(): Promise<NotificationActionEvent | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;
  await Notifications.clearLastNotificationResponseAsync();
  return toActionEvent(response);
}
