import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ClientBar } from '@/components/client-bar';
import { Duration } from '@/components/duration';
import { compactDuration, money } from '@/constants/format';
import type { Client } from '@/data';
import { spacing, touchTarget, useTheme } from '@/theme';

export function ClientRowContent({ client, weekSeconds, pressed }: { client: Client; weekSeconds: number; pressed: boolean }) {
  const { colors } = useTheme();
  const rate = `${money(client.hourlyRateCents, client.currency)}/h`;
  return (
    <View
      accessible
      accessibilityLabel={`${client.name}, ${rate}, ${compactDuration(weekSeconds)} this week${client.archivedAt ? ', archived' : ''}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: touchTarget + spacing.lg,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: pressed ? colors.surfaceSunken : colors.surface,
        opacity: client.archivedAt ? 0.6 : 1,
      }}
    >
      <ClientBar color={client.color} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" weight="600" numberOfLines={1}>
          {client.name}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1} tabular>
          {client.archivedAt ? `Archived · ${rate}` : client.address ? `${rate} · ${client.address}` : rate}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Duration seconds={weekSeconds} variant="body" weight="600" tone={weekSeconds > 0 ? 'primary' : 'secondary'} />
        <AppText variant="caption" tone="secondary">
          this week
        </AppText>
      </View>
    </View>
  );
}
