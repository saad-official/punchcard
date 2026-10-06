import { BottomSheet, Host } from '@expo/ui';
import { Pressable, View } from 'react-native';

import { spacing, touchTarget, useTheme } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconProps } from './icon';

export type SheetAction = Pick<IconProps, 'sf' | 'md'> & {
  key: string;
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

/**
 * Native modal bottom sheet listing contextual actions (Material's long-press idiom on Android;
 * iOS uses `Link.Menu` context menus instead).
 */
export function ActionSheet({
  title,
  actions,
  visible,
  onClose,
}: {
  title?: string;
  actions: SheetAction[];
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, scheme } = useTheme();
  return (
    <Host matchContents seedColor={colors.accent} colorScheme={scheme} style={{ position: 'absolute' }}>
      <BottomSheet isPresented={visible} onDismiss={onClose} containerColor={colors.surfaceElevated}>
        <View style={{ paddingBottom: spacing.lg }}>
          {title ? (
            <AppText variant="callout" tone="secondary" numberOfLines={2} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
              {title}
            </AppText>
          ) : null}
          {actions.map((a) => (
            <Pressable
              key={a.key}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={() => {
                onClose();
                a.onPress();
              }}
              style={({ pressed }) => ({
                minHeight: touchTarget + spacing.sm,
                paddingHorizontal: spacing.lg,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                backgroundColor: pressed ? colors.surfaceSunken : 'transparent',
              })}
            >
              <Icon sf={a.sf} md={a.md} size={22} color={a.destructive ? colors.danger : colors.textSecondary} />
              <AppText variant="body" tone={a.destructive ? 'danger' : 'primary'}>
                {a.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </Host>
  );
}
