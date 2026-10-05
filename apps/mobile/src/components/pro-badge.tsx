import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { microSpacing, overline, radius, spacing, useTheme } from '@/theme';

import { AppText } from './app-text';

export type PaywallReason = 'clients' | 'history' | 'branded-pdf' | 'geofence' | 'sync' | 'upgrade';

/** Open the Pro sheet, explaining which gate the user hit. */
export function openPaywall(reason: PaywallReason = 'upgrade') {
  router.push({ pathname: '/paywall', params: { reason } });
}

/** Inline "PRO" marker. Pass `reason` to make it open the paywall when tapped. */
export function ProBadge({ reason }: { reason?: PaywallReason }) {
  const { colors } = useTheme();
  const badge = (
    <View
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: microSpacing,
        borderRadius: radius.pill,
        backgroundColor: colors.accentSoft,
        alignSelf: 'center',
      }}
    >
      <AppText variant="caption" weight="800" style={[overline, { color: colors.accentText }]}>
        PRO
      </AppText>
    </View>
  );
  if (!reason) return badge;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Pro feature. Learn about Punchcard Pro"
      hitSlop={spacing.md}
      onPress={() => openPaywall(reason)}
    >
      {badge}
    </Pressable>
  );
}
