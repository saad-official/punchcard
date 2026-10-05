import type { ReactNode, Ref } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { overline, radius, spacing, textStyles, touchTarget, useTheme } from '@/theme';

import { AppText } from './app-text';

/** Label + control + inline hint or error. Errors stay next to the field, never in an alert. */
export function FormField({
  label,
  hint,
  error,
  trailing,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <AppText variant="caption" tone="secondary" style={overline}>
          {label}
        </AppText>
        {trailing}
      </View>
      {children}
      {error ? (
        <AppText variant="caption" tone="danger" selectable accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="tertiary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export type TextFieldProps = TextInputProps & { invalid?: boolean; ref?: Ref<TextInput> };

/** Large, glove-friendly text input on a sunken well. */
export function TextField({ invalid, style, multiline, ref, ...props }: TextFieldProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.textTertiary}
      selectionColor={colors.accent}
      cursorColor={colors.accent}
      multiline={multiline}
      style={[
        textStyles.body,
        {
          minHeight: multiline ? touchTarget * 2 : touchTarget + spacing.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + spacing.xs,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          backgroundColor: colors.surfaceElevated,
          color: colors.text,
          borderWidth: invalid ? 2 : 0,
          borderColor: colors.danger,
          textAlignVertical: multiline ? 'top' : 'center',
        },
        style,
      ]}
      {...props}
    />
  );
}
