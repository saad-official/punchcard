import { clientColorHex, type ClientColor } from '@punchcard/shared';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { clientBarWidth, radius } from '@/theme';

/** Thin vertical stripe in the client's colour. Stretches to its row's height. */
export function ClientBar({ color, style }: { color: ClientColor | null | undefined; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      accessible={false}
      style={[
        {
          width: clientBarWidth,
          alignSelf: 'stretch',
          borderRadius: radius.pill,
          backgroundColor: clientColorHex(color ?? 'orange'),
        },
        style,
      ]}
    />
  );
}

/** Small round marker in the client's colour. */
export function ClientDot({ color, size = 10 }: { color: ClientColor | null | undefined; size?: number }) {
  return (
    <View
      accessible={false}
      style={{ width: size, height: size, borderRadius: radius.pill, backgroundColor: clientColorHex(color ?? 'orange') }}
    />
  );
}
