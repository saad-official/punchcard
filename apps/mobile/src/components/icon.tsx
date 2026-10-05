import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

export type SfName = Extract<SymbolViewProps['name'], string>;
export type MdName = NonNullable<Exclude<SymbolViewProps['name'], string>['android']>;

export type IconProps = {
  /** SF Symbol (iOS). */
  sf: SfName;
  /** Material Symbol (Android): one icon family per platform. */
  md: MdName;
  size?: number;
  color: ColorValue;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  style?: StyleProp<ViewStyle>;
};

/** SF Symbols on iOS, Material Symbols on Android. Decorative: label the parent control. */
export function Icon({ sf, md, size = 20, color, weight = 'medium', style }: IconProps) {
  return (
    <SymbolView
      name={{ ios: sf, android: md, web: md }}
      size={size}
      tintColor={color}
      weight={process.env.EXPO_OS === 'ios' ? weight : undefined}
      style={style}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
