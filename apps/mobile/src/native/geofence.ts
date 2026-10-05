import { geofenceNudge, limitsFor, type GeofenceTransition, type Plan } from '@punchcard/shared';
import * as Location from 'expo-location';
import Storage from 'expo-sqlite/kv-store';
import * as TaskManager from 'expo-task-manager';

import { getClient } from '@/data/clients-repo';
import { getRunningEntry } from '@/data/entries-repo';
import { ensureDatabaseReady } from '@/data/migrate';
import type { Client } from '@/data/types';

import { presentGeofenceNudge } from './notifications';

export const GEOFENCE_TASK = 'PUNCHCARD_GEOFENCE';

/** iOS monitors at most 20 regions per app; Android allows 100. Keep the stricter cap. */
const MAX_REGIONS = 20;
/** Ignore repeated enter/exit flapping for the same client and kind within this window. */
const DEDUPE_MS = 10 * 60 * 1000;

// ---------------------------------------------------------------------------
// Permission

export type AlwaysPermissionStatus =
  /** Background ("Always") granted: geofences work with the app closed. */
  | 'granted'
  /** Only "While using": explain why Always is needed and link to Settings. */
  | 'foreground-only'
  | 'denied'
  | 'undetermined'
  /** Location services are off device-wide. */
  | 'services-disabled';

export type AlwaysPermission = { status: AlwaysPermissionStatus; canAskAgain: boolean };

export async function getAlwaysPermission(): Promise<AlwaysPermission> {
  if (!(await Location.hasServicesEnabledAsync())) return { status: 'services-disabled', canAskAgain: false };
  const fg = await Location.getForegroundPermissionsAsync();
  if (!fg.granted) {
    return { status: fg.status === 'undetermined' ? 'undetermined' : 'denied', canAskAgain: fg.canAskAgain };
  }
  const bg = await Location.getBackgroundPermissionsAsync();
  return bg.granted ? { status: 'granted', canAskAgain: false } : { status: 'foreground-only', canAskAgain: bg.canAskAgain };
}

/**
 * Two-step flow required by both platforms: "While using" first, then "Always"
 * (Android 11+ sends the user to Settings for the second step). Show the priming
 * screen before calling this.
 */
export async function requestAlwaysPermission(): Promise<AlwaysPermission> {
  if (!(await Location.hasServicesEnabledAsync())) return { status: 'services-disabled', canAskAgain: false };
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return { status: 'denied', canAskAgain: fg.canAskAgain };
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.granted ? { status: 'granted', canAskAgain: false } : { status: 'foreground-only', canAskAgain: bg.canAskAgain };
}

// ---------------------------------------------------------------------------
// Registration

export type GeofenceSyncResult =
  | { registered: number }
  | { registered: 0; reason: 'plan' | 'no-regions' | 'permission' | 'error'; message?: string };

function regionsFor(clients: readonly Client[]): Location.LocationRegion[] {
  return clients
    .filter((c) => !c.deletedAt && !c.archivedAt && c.lat != null && c.lng != null && (c.geofenceRadiusM ?? 0) > 0)
    .slice(0, MAX_REGIONS)
    .map((c) => ({
      identifier: c.id,
      latitude: c.lat as number,
      longitude: c.lng as number,
      // Below ~100 m both OSes fire unreliably.
      radius: Math.max(100, c.geofenceRadiusM as number),
      notifyOnEnter: true,
      notifyOnExit: true,
    }));
}

async function stopIfStarted(): Promise<void> {
  if (await Location.hasStartedGeofencingAsync(GEOFENCE_TASK).catch(() => false)) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
  }
}

/**
 * (Re)register geofences for every client with a site + radius. Call after client edits and
 * on plan changes. Pro only; stops monitoring on Free or when nothing qualifies.
 */
export async function syncGeofences(clients: readonly Client[], plan: Plan = 'pro'): Promise<GeofenceSyncResult> {
  try {
    if (!limitsFor(plan).geofences) {
      await stopIfStarted();
      return { registered: 0, reason: 'plan' };
    }
    const regions = regionsFor(clients);
    if (regions.length === 0) {
      await stopIfStarted();
      return { registered: 0, reason: 'no-regions' };
    }
    if ((await getAlwaysPermission()).status !== 'granted') return { registered: 0, reason: 'permission' };
    await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
    return { registered: regions.length };
  } catch (error) {
    return { registered: 0, reason: 'error', message: error instanceof Error ? error.message : String(error) };
  }
}

export async function stopGeofences(): Promise<void> {
  await stopIfStarted();
}

// ---------------------------------------------------------------------------
// Background task

type GeofenceTaskData = { eventType: Location.GeofencingEventType; region: Location.LocationRegion };

function toTransition(eventType: Location.GeofencingEventType): GeofenceTransition | null {
  if (eventType === Location.GeofencingEventType.Enter) return 'enter';
  if (eventType === Location.GeofencingEventType.Exit) return 'exit';
  return null;
}

function recentlyNudged(key: string, now: number): boolean {
  try {
    const last = Number(Storage.getItemSync(key) ?? 0);
    if (now - last < DEDUPE_MS) return true;
    Storage.setItemSync(key, String(now));
  } catch {
    // no dedupe store: never block a nudge
  }
  return false;
}

/** Task body, exported for testing. Policy comes from `geofenceNudge` in @punchcard/shared. */
export async function handleGeofenceEvent(data: GeofenceTaskData): Promise<void> {
  const clientId = data.region.identifier;
  if (!clientId) return;
  await ensureDatabaseReady();
  const running = getRunningEntry();
  const nudge = geofenceNudge({ running, transition: toTransition(data.eventType), clientId });
  if (!nudge) return;
  if (recentlyNudged(`punchcard.geofence.${nudge.kind}.${clientId}`, Date.now())) return;
  const client = getClient(clientId);
  if (!client || client.deletedAt) return;
  await presentGeofenceNudge({
    kind: nudge.kind,
    clientId,
    clientName: client.name,
    entryId: running?.id,
  });
}

/** Must run at module scope of the entry file (see src/native/background-tasks.ts). */
export function defineGeofenceTask(): void {
  if (TaskManager.isTaskDefined(GEOFENCE_TASK)) return;
  TaskManager.defineTask<GeofenceTaskData>(GEOFENCE_TASK, async ({ data, error }) => {
    if (error || !data) return;
    try {
      await handleGeofenceEvent(data);
    } catch (e) {
      console.warn('[geofence] task failed', e);
    }
  });
}
