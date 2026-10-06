import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { FormSheet } from '@/components/form-sheet';
import { Icon } from '@/components/icon';
import { ListGroup } from '@/components/list-row';
import { PrimaryButton } from '@/components/primary-button';
import { ProBadge, type PaywallReason } from '@/components/pro-badge';
import { showToast } from '@/components/toast';
import { LINKS, PRO_PRICES } from '@/constants/app';
import * as haptics from '@/native/haptics';
import { presentPaywall, restorePurchases, usePlan } from '@/native/purchases';
import { radius, spacing, useTheme } from '@/theme';

const REASONS: Record<PaywallReason, string> = {
  clients: 'Free covers 3 active clients. Pro has no limit.',
  history: 'Free keeps 30 days of history in timesheets and reports. Pro keeps everything.',
  'branded-pdf': 'Send timesheets with your business name and a colour header.',
  geofence: 'Get nudged to start when you arrive on site and to stop when you leave.',
  sync: 'Back up and sync your hours across phones.',
  upgrade: 'Everything a busy trade needs, without the payroll-software price.',
};

type Cell = string | boolean;
const MATRIX: { feature: string; free: Cell; pro: Cell }[] = [
  { feature: 'Clients', free: '3', pro: 'Unlimited' },
  { feature: 'History', free: '30 days', pro: 'Unlimited' },
  { feature: 'PDF timesheets', free: 'Basic', pro: 'Branded' },
  { feature: 'Job-site reminders', free: false, pro: true },
  { feature: 'Multi-device sync', free: false, pro: true },
  { feature: 'Lock Screen clock & widgets', free: true, pro: true },
];

type Status = 'idle' | 'working' | 'unavailable' | 'error';

/**
 * Frames the RevenueCat paywall: why Pro, what changes, then the store's own purchase sheet.
 * When purchases are not configured in this build, it says so instead of failing silently.
 */
export function PaywallSheet() {
  const { reason } = useLocalSearchParams<{ reason?: PaywallReason }>();
  const plan = usePlan();
  const { colors } = useTheme();
  const [status, setStatus] = useState<Status>('idle');
  const [notice, setNotice] = useState<string | null>(null);

  const upgrade = async () => {
    setStatus('working');
    const result = await presentPaywall();
    switch (result) {
      case 'purchased':
      case 'restored':
        haptics.success();
        showToast({ message: result === 'purchased' ? 'Welcome to Pro' : 'Pro restored' });
        router.back();
        return;
      case 'unavailable':
        setStatus('unavailable');
        return;
      case 'error':
        haptics.warning();
        setStatus('error');
        return;
      default:
        setStatus('idle');
    }
  };

  const restore = async () => {
    setNotice(null);
    setStatus('working');
    const next = await restorePurchases().catch(() => null);
    setStatus('idle');
    if (next === 'pro') {
      haptics.success();
      showToast({ message: 'Pro restored' });
      router.back();
    } else setNotice(next ? 'No active Pro subscription was found for this store account.' : 'Could not reach the store. Try again in a moment.');
  };

  const cell = (v: Cell, pro: boolean) =>
    typeof v === 'boolean' ? (
      <Icon
        sf={v ? 'checkmark' : 'minus'}
        md={v ? 'check' : 'remove'}
        size={18}
        weight="bold"
        color={v ? (pro ? colors.accentText : colors.text) : colors.textTertiary}
      />
    ) : (
      <AppText variant="callout" weight={pro ? '700' : '400'} tone={pro ? 'accent' : 'secondary'} align="center">
        {v}
      </AppText>
    );

  return (
    <FormSheet title="Punchcard Pro" cancelLabel="Close" error={notice}>
      <View style={{ gap: spacing.sm }}>
        <ProBadge />
        <AppText variant="title" align="center" accessibilityRole="header">
          {plan === 'pro' ? "You're on Pro" : 'Bill every hour, everywhere'}
        </AppText>
        <AppText variant="body" tone="secondary" align="center">
          {REASONS[reason ?? 'upgrade'] ?? REASONS.upgrade}
        </AppText>
      </View>

      <ListGroup>
        <View style={{ flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
          <View style={{ flex: 2 }} />
          <AppText variant="caption" tone="secondary" align="center" style={{ flex: 1 }}>
            FREE
          </AppText>
          <AppText variant="caption" tone="accent" weight="800" align="center" style={{ flex: 1 }}>
            PRO
          </AppText>
        </View>
        {MATRIX.map((row) => (
          <View
            key={row.feature}
            accessible
            accessibilityLabel={`${row.feature}: Free ${row.free === true ? 'included' : row.free === false ? 'not included' : row.free}, Pro ${row.pro === true ? 'included' : row.pro}`}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + spacing.xs }}
          >
            <AppText variant="callout" style={{ flex: 2 }}>
              {row.feature}
            </AppText>
            <View style={{ flex: 1, alignItems: 'center' }}>{cell(row.free, false)}</View>
            <View style={{ flex: 1, alignItems: 'center' }}>{cell(row.pro, true)}</View>
          </View>
        ))}
      </ListGroup>

      {status === 'unavailable' ? (
        <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.surfaceSunken }}>
          <AppText variant="callout" weight="600">
            Purchases aren’t available in this build
          </AppText>
          <AppText variant="caption" tone="secondary">
            The App Store / Google Play connection isn’t set up here yet. Your Free plan keeps working, and nothing was charged.
          </AppText>
          <PrimaryButton title="See pricing online" variant="ghost" size="sm" block={false} onPress={() => void Linking.openURL(LINKS.pricing)} />
        </View>
      ) : null}
      {status === 'error' ? (
        <AppText variant="callout" tone="danger" align="center">
          The store didn’t respond. Nothing was charged; try again in a moment.
        </AppText>
      ) : null}

      {plan === 'pro' ? (
        <PrimaryButton title="Done" size="lg" onPress={() => router.back()} />
      ) : (
        <View style={{ gap: spacing.sm }}>
          <PrimaryButton
            title="See plans"
            size="xl"
            loading={status === 'working'}
            disabled={status === 'unavailable'}
            onPress={() => void upgrade()}
          />
          <AppText variant="caption" tone="secondary" align="center" tabular>
            {`${PRO_PRICES.monthly} a month or ${PRO_PRICES.yearly} a year. Cancel anytime in your store account.`}
          </AppText>
          <PrimaryButton title="Restore purchases" variant="ghost" size="md" onPress={() => void restore()} disabled={status === 'working'} />
        </View>
      )}
    </FormSheet>
  );
}
