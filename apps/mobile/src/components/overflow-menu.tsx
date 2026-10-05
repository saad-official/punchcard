import { MenuView, type MenuAction } from '@expo/ui/community/menu';
import { View } from 'react-native';

import { radius, touchTarget, useTheme } from '@/theme';

import { Icon, type SfName } from './icon';

export type OverflowAction = { id: string; title: string; sf?: SfName; destructive?: boolean; onPress: () => void };

/** "…" button that opens a native menu (SwiftUI Menu / Material dropdown). */
export function OverflowMenu({ actions, accessibilityLabel }: { actions: OverflowAction[]; accessibilityLabel: string }) {
  const { colors, scheme } = useTheme();
  const menu: MenuAction[] = actions.map((a) => ({
    id: a.id,
    title: a.title,
    image: process.env.EXPO_OS === 'ios' ? a.sf : undefined,
    attributes: a.destructive ? { destructive: true } : undefined,
  }));
  return (
    <MenuView
      actions={menu}
      colorScheme={scheme}
      onPressAction={(e) => actions.find((a) => a.id === e.nativeEvent.event)?.onPress()}
    >
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={{ width: touchTarget, height: touchTarget, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon sf="ellipsis.circle" md="more_vert" size={22} color={colors.textSecondary} />
      </View>
    </MenuView>
  );
}
