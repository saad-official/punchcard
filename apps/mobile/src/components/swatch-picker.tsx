import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { tapLight } from '@/native/haptics';
import { cssEasing, microSpacing, motion, radius, spacing, touchTarget, useTheme } from '@/theme';

import { Icon } from './icon';

export type Swatch = { id: string; hex: string; label: string };

/** Row of colour swatches (client colours, accents). Single selection, read as radio buttons. */
export function SwatchPicker({
  swatches,
  value,
  onChange,
  size = touchTarget,
}: {
  swatches: readonly Swatch[];
  value: string;
  onChange: (id: string) => void;
  size?: number;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + spacing.xs }}>
      {swatches.map((s) => {
        const selected = s.id === value;
        return (
          <Pressable
            key={s.id}
            accessibilityRole="radio"
            accessibilityLabel={s.label}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => {
              if (!selected) tapLight();
              onChange(s.id);
            }}
          >
            <Animated.View
              style={{
                width: size,
                height: size,
                borderRadius: radius.pill,
                padding: microSpacing + 1,
                borderWidth: 2,
                borderColor: selected ? colors.text : 'transparent',
                transitionProperty: 'borderColor',
                transitionDuration: motion.duration.fast,
                transitionTimingFunction: cssEasing.standard,
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: radius.pill,
                  backgroundColor: s.hex,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selected ? <Icon sf="checkmark" md="check" size={16} color={colors.onAccent} weight="bold" /> : null}
              </View>
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}
