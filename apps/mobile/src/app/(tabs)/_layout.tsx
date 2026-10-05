import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/theme';

const ANDROID = process.env.EXPO_OS === 'android';

/** The platform tab bar: Liquid Glass on iOS 26, Material 3 navigation bar on Android. */
export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const tint = isDark ? colors.accent : colors.accentText;
  return (
    <NativeTabs
      tintColor={tint}
      minimizeBehavior="onScrollDown"
      backgroundColor={ANDROID ? colors.surfaceElevated : undefined}
      indicatorColor={ANDROID ? colors.accentSoft : undefined}
      iconColor={ANDROID ? { default: colors.textSecondary, selected: colors.accentText } : undefined}
      labelStyle={ANDROID ? { default: { color: colors.textSecondary }, selected: { color: colors.text } } : undefined}
    >
      <NativeTabs.Trigger name="clock">
        <NativeTabs.Trigger.Icon sf="clock.fill" md="schedule" />
        <NativeTabs.Trigger.Label>Clock</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="timesheet">
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        <NativeTabs.Trigger.Label>Timesheet</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="clients">
        <NativeTabs.Trigger.Icon sf="person.2.fill" md="group" />
        <NativeTabs.Trigger.Label>Clients</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reports">
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="bar_chart" />
        <NativeTabs.Trigger.Label>Reports</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
