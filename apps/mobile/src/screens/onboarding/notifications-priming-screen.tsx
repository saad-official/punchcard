import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Icon, type IconProps } from '@/components/icon';
import { PrimaryButton } from '@/components/primary-button';
import { setSetting } from '@/data';
import * as haptics from '@/native/haptics';
import { requestNotificationPermission } from '@/native/notifications';
import { radius, spacing, useTheme } from '@/theme';

const REASONS: { icon: Pick<IconProps, 'sf' | 'md'>; title: string; body: string }[] = [
  {
    icon: { sf: 'alarm', md: 'alarm' },
    title: 'Forgot to stop?',
    body: 'One nudge if the clock is still running after a long day.',
  },
  {
    icon: { sf: 'lock.iphone', md: 'lock_clock' },
    title: 'Stop from the Lock Screen',
    body: 'Stop and Break buttons right on the running-timer notification.',
  },
  {
    icon: { sf: 'mappin.and.ellipse', md: 'location_on' },
    title: 'Job-site reminders (Pro)',
    body: 'Start when you arrive, stop when you leave.',
  },
];

/** Explains notifications before the one-time system prompt, then finishes onboarding. */
export function NotificationsPrimingScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);

  // Flipping `onboarded` swaps the protected route groups: the root stack moves to the tabs.
  const finish = () => {
    haptics.success();
    setSetting('onboarded', true);
  };

  const allow = async () => {
    setBusy(true);
    try {
      await requestNotificationPermission();
    } catch {
      // The prompt failing must never block getting into the app.
    }
    finish();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: insets.top + spacing.xl,
          paddingHorizontal: spacing.lg,
          gap: spacing.xl,
        }}
      >
        <View
          style={{
            width: spacing.xxl + spacing.lg,
            height: spacing.xxl + spacing.lg,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon sf="bell.badge.fill" md="notifications_active" size={36} color={colors.onAccent} />
        </View>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="title" accessibilityRole="header">
            Keep the clock honest
          </AppText>
          <AppText variant="body" tone="secondary">
            Punchcard only notifies you about your own clock. No marketing, ever.
          </AppText>
        </View>
        <View style={{ gap: spacing.lg }}>
          {REASONS.map((r) => (
            <View key={r.title} style={{ flexDirection: 'row', gap: spacing.md }}>
              <Icon sf={r.icon.sf} md={r.icon.md} size={24} color={colors.accentText} style={{ marginTop: spacing.xs / 2 }} />
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight="600">
                  {r.title}
                </AppText>
                <AppText variant="callout" tone="secondary">
                  {r.body}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.md, gap: spacing.sm }}>
        <PrimaryButton title="Turn on notifications" size="lg" loading={busy} onPress={() => void allow()} />
        <PrimaryButton title="Not now" variant="ghost" size="md" disabled={busy} onPress={finish} />
      </View>
    </View>
  );
}
