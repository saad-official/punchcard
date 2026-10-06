import { Host, SegmentedButton, SingleChoiceSegmentedButtonRow, Text } from '@expo/ui/jetpack-compose';

import { useTheme } from '@/theme';

import type { SegmentedControlProps } from './segmented-control.types';

/**
 * Material 3 segmented buttons. Unlike the community wrapper, the host is seeded with the accent
 * and every state colour comes from the theme, so the control never picks up the wallpaper's
 * Material You palette (blue outlines, lavender labels) or low-contrast text on the accent fill.
 */
export function SegmentedControl({ values, selectedIndex, onChange }: SegmentedControlProps) {
  const { colors, scheme } = useTheme();
  const buttonColors = {
    activeContainerColor: colors.accent,
    activeContentColor: colors.onAccent,
    activeBorderColor: colors.border,
    inactiveContentColor: colors.text,
    inactiveBorderColor: colors.border,
  };
  return (
    <Host matchContents={{ vertical: true }} seedColor={colors.accent} colorScheme={scheme}>
      <SingleChoiceSegmentedButtonRow>
        {values.map((label, index) => (
          <SegmentedButton key={label} selected={index === selectedIndex} onClick={() => onChange(index)} colors={buttonColors}>
            <SegmentedButton.Label>
              <Text>{label}</Text>
            </SegmentedButton.Label>
          </SegmentedButton>
        ))}
      </SingleChoiceSegmentedButtonRow>
    </Host>
  );
}
