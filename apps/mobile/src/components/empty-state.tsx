import type { ReactNode } from 'react';
import { View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconProps } from './icon';

export type EmptyStateProps = {
  icon: Pick<IconProps, 'sf' | 'md'>;
  title: string;
  body?: string;
  /** Usually a `PrimaryButton`. */
  action?: ReactNode;
};

/** What a section shows when it has nothing yet, with the next useful step. */
export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg }}>
      <View
        style={{
          width: spacing.xxl + spacing.md,
          height: spacing.xxl + spacing.md,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon sf={icon.sf} md={icon.md} size={28} color={colors.accentText} weight="semibold" />
      </View>
      <View style={{ gap: spacing.xs, alignItems: 'center' }}>
        <AppText variant="headline" align="center" accessibilityRole="header">
          {title}
        </AppText>
        {body ? (
          <AppText variant="callout" tone="secondary" align="center">
            {body}
          </AppText>
        ) : null}
      </View>
      {action ? <View style={{ alignSelf: 'stretch', alignItems: 'center' }}>{action}</View> : null}
    </View>
  );
}
