import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { ClientDot } from '@/components/client-bar';
import { GlassCard } from '@/components/glass-card';
import { Money } from '@/components/money';
import { PrimaryButton } from '@/components/primary-button';
import { TimerDisplay } from '@/components/timer-display';
import { formatTime, money } from '@/constants/format';
import { toggleBreak } from '@/data';
import { useRunningEntry } from '@/hooks/use-running-entry';
import * as haptics from '@/native/haptics';
import { easing, motion, radius, spacing, useTheme } from '@/theme';

const CONTENT_ENTER = FadeIn.duration(motion.duration.base).easing(easing.standard);

/**
 * The floating clock card (Liquid Glass on iOS 26): client, the huge ticking timer, earnings
 * so far, Break and Switch job. Owns the 1 Hz subscription so only this card re-renders.
 */
export function RunningCard() {
  const running = useRunningEntry();
  const { colors } = useTheme();
  if (!running) return null;
  const { entry, elapsedSeconds, onBreak, currentBreakSeconds, earningsCents } = running;

  return (
    <GlassCard padding={spacing.lg}>
      <Animated.View entering={CONTENT_ENTER} style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ClientDot color={entry.clientColor} size={12} />
          <View style={{ flex: 1 }}>
            <AppText variant="headline" numberOfLines={1}>
              {entry.clientName}
            </AppText>
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              {[entry.jobName, `since ${formatTime(entry.startedAt)}`].filter(Boolean).join(' · ')}
            </AppText>
          </View>
          {onBreak ? (
            <View style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.accentSoft }}>
              <AppText variant="caption" weight="700" tone="accent">
                On break
              </AppText>
            </View>
          ) : null}
        </View>

        <View style={{ gap: spacing.xs }}>
          <TimerDisplay seconds={elapsedSeconds} dimmed={onBreak} accessibilityLabelPrefix="Time worked" />
          {onBreak ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
              <AppText variant="callout" tone="accent" weight="600">
                Break
              </AppText>
              <TimerDisplay seconds={currentBreakSeconds} variant="headline" accessibilityLabelPrefix="Break" />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
              <Money cents={earningsCents} currency={entry.currency} variant="headline" weight="600" />
              <AppText variant="caption" tone="secondary">
                {`earned at ${money(entry.hourlyRateCents, entry.currency)}/h`}
              </AppText>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <PrimaryButton
            title={onBreak ? 'Resume' : 'Break'}
            icon={onBreak ? { sf: 'play.fill', md: 'play_arrow' } : { sf: 'cup.and.saucer.fill', md: 'coffee' }}
            variant="secondary"
            size="lg"
            style={{ flex: 1 }}
            accessibilityHint={onBreak ? 'Ends the break and resumes the timer' : 'Pauses the timer for a break'}
            onPress={() => {
              const t = toggleBreak();
              if (t.events.length) haptics.tapLight();
            }}
          />
          <PrimaryButton
            title="Switch job"
            icon={{ sf: 'arrow.triangle.swap', md: 'swap_horiz' }}
            variant="secondary"
            size="lg"
            style={{ flex: 1 }}
            onPress={() => router.push({ pathname: '/client-picker', params: { mode: 'switch' } })}
          />
        </View>
      </Animated.View>
    </GlassCard>
  );
}
