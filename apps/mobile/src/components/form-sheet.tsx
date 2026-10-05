import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { radius, spacing, touchTarget, useTheme } from '@/theme';

import { AppText } from './app-text';
import { GlassCard } from './glass-card';

/** Height of the floating sheet header (below the iOS grabber). */
const HEADER_HEIGHT = touchTarget + spacing.md;

export type FormSheetProps = {
  title: string;
  children: ReactNode;
  /** Primary action label, e.g. "Save" or "Add". Omit for read-only sheets. */
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  busy?: boolean;
  /** Defaults to dismissing the sheet. */
  onCancel?: () => void;
  cancelLabel?: string;
  /**
   * Problem with the last action, shown inline at the top. Sheets cover the root toast
   * layer, so failures inside a sheet are never toasts.
   */
  error?: string | null;
};

function HeaderButton({
  label,
  onPress,
  emphasis,
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  emphasis?: boolean;
  disabled?: boolean;
  busy?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      hitSlop={spacing.sm}
      style={({ pressed }) => ({
        minHeight: touchTarget,
        minWidth: touchTarget,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
      })}
    >
      {busy ? (
        <ActivityIndicator color={colors.accentText} />
      ) : (
        <AppText variant="body" weight={emphasis ? '700' : '400'} tone={emphasis ? 'accent' : 'primary'}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

/**
 * Content of a `formSheet` route: a floating glass header (Cancel / title / primary action)
 * over a scrolling form. Dismissal by drag stays native; the header just names the task.
 */
export function FormSheet({
  title,
  children,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  busy,
  onCancel,
  cancelLabel = 'Cancel',
  error,
}: FormSheetProps) {
  const { colors } = useTheme();
  const cancel = onCancel ?? (() => router.back());
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingTop: HEADER_HEIGHT + spacing.lg,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xxl,
          gap: spacing.lg,
        }}
      >
        {error ? (
          <View
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
            style={{ padding: spacing.md, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.surfaceSunken }}
          >
            <AppText variant="callout" tone="danger" selectable>
              {error}
            </AppText>
          </View>
        ) : null}
        {children}
      </ScrollView>
      <View style={{ position: 'absolute', top: spacing.sm, start: spacing.sm, end: spacing.sm }}>
        <GlassCard radius="pill" padding={0} style={{ minHeight: HEADER_HEIGHT - spacing.sm, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xs }}>
            <HeaderButton label={cancelLabel} onPress={cancel} />
            <AppText
              variant="body"
              weight="600"
              align="center"
              numberOfLines={1}
              accessibilityRole="header"
              style={{ flex: 1 }}
            >
              {title}
            </AppText>
            {primaryLabel && onPrimary ? (
              <HeaderButton label={primaryLabel} onPress={onPrimary} emphasis disabled={primaryDisabled} busy={busy} />
            ) : (
              <View style={{ minWidth: touchTarget }} />
            )}
          </View>
        </GlassCard>
      </View>
    </View>
  );
}
