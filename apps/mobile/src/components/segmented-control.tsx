import { SegmentedControl as NativeSegmentedControl } from '@expo/ui/community/segmented-control';

import { useTheme } from '@/theme';

import type { SegmentedControlProps } from './segmented-control.types';

/** Native segmented picker (SwiftUI segmented `Picker` on iOS), following the app's scheme. */
export function SegmentedControl({ values, selectedIndex, onChange }: SegmentedControlProps) {
  const { colors, scheme } = useTheme();
  return (
    <NativeSegmentedControl
      values={[...values]}
      selectedIndex={selectedIndex}
      onChange={(e) => onChange(e.nativeEvent.selectedSegmentIndex)}
      tintColor={colors.accent}
      appearance={scheme}
    />
  );
}
