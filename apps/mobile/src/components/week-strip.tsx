import type { WeekRange } from '@punchcard/shared';
import { useEffect, useRef, type ReactNode } from 'react';
import { FlatList, Pressable, useWindowDimensions, View } from 'react-native';

import { formatDayLong, formatWeekdayNarrow, spokenDuration } from '@/constants/format';
import { tapLight } from '@/native/haptics';
import { microSpacing, radius, spacing, touchTarget, useTheme } from '@/theme';

import { AppText } from './app-text';

/** Local noon of a `YYYY-MM-DD` key: safe to format in the device time zone. */
export const dayKeyToDate = (key: string) => new Date(`${key}T12:00:00`);

const hoursLabel = (seconds: number) => {
  if (seconds <= 0) return '–';
  const h = seconds / 3600;
  return h >= 10 ? `${Math.round(h)}h` : `${Math.round(h * 10) / 10}h`;
};

export type WeekDaysProps = {
  days: readonly string[];
  totals: Readonly<Record<string, number>>;
  selectedDay: string;
  today: string;
  onSelectDay: (day: string) => void;
};

/** Seven day cells: weekday, date, hours worked. Today is marked; the selection is filled. */
export function WeekDays({ days, totals, selectedDay, today, onSelectDay }: WeekDaysProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs }} accessibilityRole="tablist">
      {days.map((day) => {
        const selected = day === selectedDay;
        const isToday = day === today;
        const date = dayKeyToDate(day);
        const seconds = totals[day] ?? 0;
        const fg = selected ? colors.onAccent : isToday ? colors.accentText : colors.text;
        return (
          <Pressable
            key={day}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${formatDayLong(date)}${isToday ? ', today' : ''}, ${seconds > 0 ? spokenDuration(seconds) : 'no time'}`}
            onPress={() => {
              if (!selected) tapLight();
              onSelectDay(day);
            }}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: touchTarget + spacing.lg,
              paddingVertical: spacing.sm,
              borderRadius: radius.md,
              borderCurve: 'continuous',
              alignItems: 'center',
              justifyContent: 'center',
              gap: microSpacing,
              backgroundColor: selected ? colors.accent : pressed ? colors.surfaceSunken : 'transparent',
            })}
          >
            <AppText variant="caption" style={{ color: selected ? colors.onAccent : colors.textSecondary }}>
              {formatWeekdayNarrow(date)}
            </AppText>
            <AppText variant="headline" tabular style={{ color: fg }}>
              {String(date.getDate())}
            </AppText>
            <AppText
              variant="caption"
              tabular
              style={{ color: selected ? colors.onAccent : seconds > 0 ? colors.textSecondary : colors.textTertiary }}
            >
              {hoursLabel(seconds)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export type WeekStripProps = {
  /** Oldest first; the last week is the current one. */
  weeks: readonly WeekRange[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Render one page; usually a component that reads that week's totals and renders `WeekDays`. */
  renderWeek: (week: WeekRange) => ReactNode;
};

/** Horizontally swipeable week pager. Swipe snaps a whole week at a time. */
export function WeekStrip({ weeks, index, onIndexChange, renderWeek }: WeekStripProps) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<WeekRange>>(null);
  const visible = useRef(index);

  // Follow programmatic changes ("Today", picking a date in another week).
  useEffect(() => {
    if (visible.current === index) return;
    visible.current = index;
    listRef.current?.scrollToIndex({ index, animated: true });
  }, [index]);

  return (
    <FlatList
      ref={listRef}
      data={weeks}
      keyExtractor={(w) => w.start}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      initialScrollIndex={index}
      getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      windowSize={3}
      initialNumToRender={1}
      maxToRenderPerBatch={2}
      style={{ marginHorizontal: -spacing.md, flexGrow: 0 }}
      onMomentumScrollEnd={(e) => {
        const next = Math.round(e.nativeEvent.contentOffset.x / width);
        if (next !== visible.current && next >= 0 && next < weeks.length) {
          visible.current = next;
          tapLight();
          onIndexChange(next);
        }
      }}
      renderItem={({ item }) => <View style={{ width, paddingHorizontal: spacing.md }}>{renderWeek(item)}</View>}
    />
  );
}
