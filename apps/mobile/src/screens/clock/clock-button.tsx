import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { clockButtonHeight, easing, motion, radius, spacing, useTheme } from '@/theme';

export type ClockButtonProps = {
  running: boolean;
  /** Idle label, e.g. "Start". */
  startLabel: string;
  /** Idle caption under the label, e.g. the client that will start. */
  startCaption?: string;
  onPress: () => void;
  accessibilityHint?: string;
};

/**
 * The one big button. Idle it is safety orange and starts the clock; running it morphs into
 * the Stop button (colour + label crossfade on the UI thread). Press feedback comes from a
 * `Gesture.Tap` so it never waits on the JS thread.
 */
export function ClockButton({ running, startLabel, startCaption, onPress, accessibilityHint }: ClockButtonProps) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(running ? 1 : 0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    progress.set(withTiming(running ? 1 : 0, { duration: reduced ? 0 : motion.duration.base, easing: easing.standard }));
  }, [running, progress, reduced]);

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(2500) // gloved, deliberate presses are slow
        .onBegin(() => {
          pressed.set(withTiming(1, { duration: motion.duration.fast, easing: easing.standard }));
        })
        .onFinalize(() => {
          pressed.set(withTiming(0, { duration: motion.duration.fast, easing: easing.standard }));
        })
        .onEnd((_e, success) => {
          if (success) scheduleOnRN(onPress);
        }),
    [onPress, pressed],
  );

  const idleBg = colors.accent;
  const runBg = colors.danger;
  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], [idleBg, runBg]),
    transform: [{ scale: interpolate(pressed.get(), [0, 1], [1, 0.97]) }],
  }));
  const startStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.get(),
    transform: [{ translateY: interpolate(progress.get(), [0, 1], [0, reduced ? 0 : -spacing.sm]) }],
  }));
  const stopStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: interpolate(progress.get(), [0, 1], [reduced ? 0 : spacing.sm, 0]) }],
  }));

  const label = running ? 'Stop the clock' : startCaption ? `${startLabel}, ${startCaption}` : startLabel;

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'activate') onPress();
        }}
        style={[
          {
            minHeight: clockButtonHeight,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            justifyContent: 'center',
            paddingHorizontal: spacing.lg,
          },
          containerStyle,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }, startStyle]}
          importantForAccessibility="no-hide-descendants"
        >
          <Icon sf="play.fill" md="play_arrow" size={28} color={colors.onAccent} />
          <View style={{ flex: 1 }}>
            <AppText variant="title" style={{ color: colors.onAccent }} numberOfLines={1}>
              {startLabel}
            </AppText>
            {startCaption ? (
              <AppText variant="callout" style={{ color: colors.onAccent, opacity: 0.8 }} numberOfLines={1}>
                {startCaption}
              </AppText>
            ) : null}
          </View>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          style={[
            {
              position: 'absolute',
              start: spacing.lg,
              end: spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.md,
            },
            stopStyle,
          ]}
        >
          <Icon sf="stop.fill" md="stop" size={28} color={colors.onDanger} />
          <AppText variant="title" style={{ color: colors.onDanger }}>
            Stop
          </AppText>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
