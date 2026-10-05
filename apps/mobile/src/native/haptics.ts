import * as Haptics from 'expo-haptics';

// Semantic haptics. Failures (unsupported device, haptics disabled) are swallowed: haptics
// are feedback, never a reason for an action to fail.
const safe = (p: Promise<void>) => {
  p.catch(() => undefined);
};

/** Light tap for selections, chips, toggles. */
export function tapLight(): void {
  safe(Haptics.selectionAsync());
}

/** Clock-in / start (spec: impactMedium). */
export function clockIn(): void {
  safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Clock-out / stop. */
export function clockOut(): void {
  safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

/** Completed task, e.g. export shared (spec: notificationSuccess). */
export function success(): void {
  safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Blocked or risky action (plan limit hit, overlapping entry). */
export function warning(): void {
  safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
