import { router } from 'expo-router';
import { useState, type ComponentType } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/app-text';
import { PrimaryButton } from '@/components/primary-button';
import * as haptics from '@/native/haptics';
import { radius, spacing, useTheme } from '@/theme';

import { LockScreenArt, TapOnceArt, TimesheetArt } from './illustrations';

const PAGES: { title: string; body: string; Art: ComponentType }[] = [
  {
    title: 'Tap once.\nBill every hour.',
    body: 'Start the clock for a client with one big button, even with gloves on. Breaks and job switches are one tap too.',
    Art: TapOnceArt,
  },
  {
    title: 'Your clock lives on the Lock Screen',
    body: 'The timer and what you have earned keep running on the Lock Screen and in notifications. Stop or take a break without opening the app.',
    Art: LockScreenArt,
  },
  {
    title: 'Timesheets your clients accept',
    body: 'Every hour lands on the right client. Send a clean PDF or CSV for the week straight from your phone.',
    Art: TimesheetArt,
  },
];

const DOT = spacing.sm;

export function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const scrollX = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const [page, setPage] = useState(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.set(e.contentOffset.x);
  });

  const onPageChange = (next: number) => {
    haptics.tapLight();
    setPage(next);
  };

  // One haptic tick when a new page settles under the finger, never per frame.
  useAnimatedReaction(
    () => Math.round(scrollX.get() / Math.max(1, width)),
    (current, previous) => {
      if (previous !== null && current !== previous) scheduleOnRN(onPageChange, current);
    },
  );

  const last = page === PAGES.length - 1;
  const next = () => {
    if (last) router.push('/notifications');
    else scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top, paddingBottom: insets.bottom + spacing.md }}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {PAGES.map((p, i) => (
          <Page key={p.title} index={i} width={width} scrollX={scrollX} reduced={reduced} {...p} />
        ))}
      </Animated.ScrollView>

      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm }}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}
        >
          {PAGES.map((p, i) => (
            <Dot key={p.title} index={i} width={width} scrollX={scrollX} />
          ))}
        </View>
        <PrimaryButton title={last ? 'Get started' : 'Continue'} size="lg" onPress={next} />
        {last ? null : (
          <PrimaryButton title="Skip" variant="ghost" size="sm" onPress={() => router.push('/notifications')} />
        )}
      </View>
    </View>
  );
}

function Page({
  index,
  width,
  scrollX,
  reduced,
  title,
  body,
  Art,
}: {
  index: number;
  width: number;
  scrollX: SharedValue<number>;
  reduced: boolean;
  title: string;
  body: string;
  Art: ComponentType;
}) {
  const input = [(index - 1) * width, index * width, (index + 1) * width];
  // Parallax: the art travels further than the page, the text a little less.
  const artStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.get(), input, [0, 1, 0], Extrapolation.CLAMP),
    transform: reduced ? [] : [{ translateX: interpolate(scrollX.get(), input, [width * 0.35, 0, -width * 0.35], Extrapolation.CLAMP) }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.get(), input, [0.2, 1, 0.2], Extrapolation.CLAMP),
    transform: reduced ? [] : [{ translateX: interpolate(scrollX.get(), input, [width * 0.12, 0, -width * 0.12], Extrapolation.CLAMP) }],
  }));
  return (
    <View style={{ width, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, gap: spacing.xl, justifyContent: 'center' }}>
      <Animated.View style={[{ alignItems: 'center', minHeight: spacing.xxl * 5, justifyContent: 'center' }, artStyle]}>
        <Art />
      </Animated.View>
      <Animated.View style={[{ gap: spacing.sm }, textStyle]}>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="body" tone="secondary">
          {body}
        </AppText>
      </Animated.View>
    </View>
  );
}

function Dot({ index, width, scrollX }: { index: number; width: number; scrollX: SharedValue<number> }) {
  const { colors } = useTheme();
  const on = colors.accent;
  const off = colors.border;
  const input = [(index - 1) * width, index * width, (index + 1) * width];
  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(scrollX.get(), input, [off, on, off]),
    transform: [{ scale: interpolate(scrollX.get(), input, [1, 1.35, 1], Extrapolation.CLAMP) }],
  }));
  return <Animated.View style={[{ width: DOT, height: DOT, borderRadius: radius.pill }, style]} />;
}
