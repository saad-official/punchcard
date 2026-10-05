import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { formatDate, formatTime, USES_24H } from '@/constants/format';
import { radius, spacing, touchTarget, useTheme } from '@/theme';

import { AppText } from './app-text';

export type DateFieldProps = {
  value: Date;
  onChange: (next: Date) => void;
  mode: 'date' | 'time';
  accessibilityLabel: string;
  minimumDate?: Date;
  maximumDate?: Date;
};

/**
 * Native date / time control. iOS renders the compact SwiftUI picker inline; Android shows a
 * value button that opens the Material dialog.
 */
export function DateField({ value, onChange, mode, accessibilityLabel, minimumDate, maximumDate }: DateFieldProps) {
  const { colors, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  // Keep the other half of the timestamp: a time pick never moves the day, and vice versa.
  const commit = (picked: Date) => {
    const next = new Date(value);
    if (mode === 'time') next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    else next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    onChange(next);
  };

  if (process.env.EXPO_OS === 'ios') {
    return (
      <View style={{ minHeight: touchTarget, justifyContent: 'center', alignItems: 'flex-start' }} accessibilityLabel={accessibilityLabel}>
        <DateTimePicker
          value={value}
          mode={mode}
          display="compact"
          accentColor={colors.accent}
          themeVariant={isDark ? 'dark' : 'light'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onValueChange={(_, date) => commit(date)}
        />
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}, ${mode === 'date' ? formatDate(value) : formatTime(value)}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          minHeight: touchTarget,
          paddingHorizontal: spacing.md,
          justifyContent: 'center',
          alignSelf: 'flex-start',
          borderRadius: radius.sm,
          backgroundColor: pressed ? colors.border : colors.surfaceSunken,
        })}
      >
        <AppText variant="body" tabular>
          {mode === 'date' ? formatDate(value) : formatTime(value)}
        </AppText>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={value}
          mode={mode}
          is24Hour={USES_24H}
          accentColor={colors.accent}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, date) => {
            setOpen(false);
            if (event.type === 'set' && date) commit(date);
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
