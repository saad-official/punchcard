import type { ReactNode } from 'react';
import { View } from 'react-native';

import { overline, spacing } from '@/theme';

import { AppText } from './app-text';

/** Label above a group or list section, with an optional trailing value or action. */
export function SectionHeader({
  title,
  trailing,
  footnote,
}: {
  title: string;
  trailing?: ReactNode;
  footnote?: string;
}) {
  return (
    <View style={{ paddingHorizontal: spacing.md, gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm }}>
        <AppText variant="caption" tone="secondary" accessibilityRole="header" style={overline}>
          {title}
        </AppText>
        {trailing}
      </View>
      {footnote ? (
        <AppText variant="caption" tone="tertiary">
          {footnote}
        </AppText>
      ) : null}
    </View>
  );
}

/** Small explanatory text under a group. */
export function SectionFooter({ children }: { children: string }) {
  return (
    <AppText variant="caption" tone="secondary" style={{ paddingHorizontal: spacing.md }}>
      {children}
    </AppText>
  );
}
