import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createStore, useStore } from '@/data';
import { tapLight } from '@/native/haptics';
import { easing, motion, radius, spacing, touchTarget, useTheme } from '@/theme';

import { AppText } from './app-text';

export type ToastInput = {
  message: string;
  /** e.g. "Undo". The toast stays a little longer when it offers an action. */
  actionLabel?: string;
  onAction?: () => void;
};

type ToastState = (ToastInput & { id: number }) | null;

const store = createStore<ToastState>(null);
let timer: ReturnType<typeof setTimeout> | null = null;
let seq = 0;

/** Show a short, non-blocking message at the bottom of the screen (replaces any current one). */
export function showToast(input: ToastInput): void {
  if (timer) clearTimeout(timer);
  const id = ++seq;
  store.setState({ ...input, id });
  timer = setTimeout(() => dismissToast(id), input.actionLabel ? 5000 : 3000);
}

export function dismissToast(id?: number): void {
  if (id !== undefined && store.getSnapshot()?.id !== id) return;
  if (timer) clearTimeout(timer);
  timer = null;
  store.setState(null);
}

// Module scope: layout-animation builders are not rebuilt per render.
const ENTER = FadeInDown.duration(motion.duration.base).easing(easing.standard);
const EXIT = FadeOutDown.duration(motion.duration.fast + 50).easing(easing.standard);

/** Space reserved for the tab bar so toasts never sit on top of it. */
const TAB_BAR_CLEARANCE = process.env.EXPO_OS === 'android' ? 88 : 64;

/** Mount once at the root. */
export function ToastHost() {
  const toast = useStore(store);
  const insets = useSafeAreaInsets();
  const { colors, shadow } = useTheme();
  if (!toast) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', start: 0, end: 0, bottom: insets.bottom + TAB_BAR_CLEARANCE, paddingHorizontal: spacing.md }}
    >
      <Animated.View
        key={toast.id}
        entering={ENTER}
        exiting={EXIT}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={{
          minHeight: touchTarget + spacing.sm,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          backgroundColor: colors.inverseSurface,
          boxShadow: shadow('lg'),
          flexDirection: 'row',
          alignItems: 'center',
          paddingStart: spacing.md,
          paddingEnd: toast.actionLabel ? spacing.xs : spacing.md,
          gap: spacing.sm,
        }}
      >
        <AppText variant="callout" style={{ flex: 1, color: colors.inverseText, paddingVertical: spacing.sm }}>
          {toast.message}
        </AppText>
        {toast.actionLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={toast.actionLabel}
            hitSlop={spacing.sm}
            onPress={() => {
              tapLight();
              toast.onAction?.();
              dismissToast(toast.id);
            }}
            style={({ pressed }) => ({
              minHeight: touchTarget,
              justifyContent: 'center',
              paddingHorizontal: spacing.md,
              borderRadius: radius.sm,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <AppText variant="callout" weight="700" style={{ color: colors.accent }}>
              {toast.actionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}
