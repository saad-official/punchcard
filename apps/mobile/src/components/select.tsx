import { Host, Picker } from '@expo/ui';
import { View } from 'react-native';

import { useTheme } from '@/theme';

export type SelectOption<T extends string | number> = { label: string; value: T };

/**
 * Native single-choice menu (SwiftUI `Picker` / Compose dropdown) for a short option list.
 * Tinted with the accent through the host's seed colour.
 */
export function Select<T extends string | number>({
  value,
  options,
  onChange,
  accessibilityLabel,
  disabled,
}: {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  const { colors, scheme } = useTheme();
  return (
    <View accessibilityLabel={accessibilityLabel} style={{ alignSelf: 'flex-start' }}>
      <Host matchContents seedColor={colors.accent} colorScheme={scheme}>
        <Picker<T> selectedValue={value} onValueChange={onChange} appearance="menu" enabled={!disabled}>
          {options.map((o) => (
            <Picker.Item key={String(o.value)} label={o.label} value={o.value} />
          ))}
        </Picker>
      </Host>
    </View>
  );
}
