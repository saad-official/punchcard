// iOS home-screen / Lock Screen widget: today's total, the running job, and a
// "start last job" link. Same isolated-runtime rules as running-entry.activity.tsx:
// only @expo/ui/swift-ui globals, props and environment inside the 'widget' function.
import { AccessoryWidgetBackground, HStack, Link, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type WidgetPalette = { surface: string; text: string; textSecondary: string; accent: string };

export type TodayWidgetProps = {
  /** Worked seconds today at `snapshotAtMs`. */
  todaySeconds: number;
  /** "6.5h" style label of `todaySeconds` for static rendering. */
  todayLabel: string;
  /** When running (and not on break): epoch ms such that a count-up timer from it shows today's total live. */
  todayTimerStartMs: number | null;
  runningClientName: string | null;
  runningColorHex: string | null;
  /** Timer origin for the running entry's own elapsed time (startedAt + breakSeconds). */
  runningTimerStartMs: number | null;
  onBreak: boolean;
  lastClientId: string | null;
  lastClientName: string | null;
  snapshotAtMs: number;
  palette: { light: WidgetPalette; dark: WidgetPalette };
};

const TodayWidget = (props: TodayWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const c = environment.colorScheme === 'dark' ? props.palette.dark : props.palette.light;
  const family = environment.widgetFamily;
  const live = props.todayTimerStartMs != null;
  const week = 7 * 24 * 3600 * 1000;
  const total = live ? (
    <Text
      timerInterval={{ lower: new Date(props.todayTimerStartMs as number), upper: new Date((props.todayTimerStartMs as number) + week) }}
      countsDown={false}
      modifiers={[font({ size: 30, weight: 'bold' }), monospacedDigit(), minimumScaleFactor(0.6), foregroundStyle(c.text)]}
    />
  ) : (
    <Text modifiers={[font({ size: 30, weight: 'bold' }), monospacedDigit(), foregroundStyle(c.text)]}>{props.todayLabel}</Text>
  );

  if (family === 'accessoryCircular') {
    return (
      <ZStack modifiers={[widgetURL('punchcard://clock')]}>
        <AccessoryWidgetBackground />
        <VStack spacing={0}>
          <Text modifiers={[font({ size: 16, weight: 'bold' }), monospacedDigit(), minimumScaleFactor(0.5)]}>
            {props.todayLabel}
          </Text>
          <Text modifiers={[font({ size: 9 })]}>{props.runningClientName ? (props.onBreak ? 'break' : 'on') : 'today'}</Text>
        </VStack>
      </ZStack>
    );
  }

  const running = props.runningClientName ? (
    <HStack spacing={6}>
      <Text modifiers={[font({ size: 13, weight: 'semibold' }), lineLimit(1), foregroundStyle(props.runningColorHex ?? c.accent)]}>
        {props.onBreak ? `${props.runningClientName} · break` : props.runningClientName}
      </Text>
    </HStack>
  ) : (
    <Text modifiers={[font({ size: 13 }), lineLimit(1), foregroundStyle(c.textSecondary)]}>Not clocked in</Text>
  );

  if (family === 'systemMedium') {
    return (
      <HStack modifiers={[padding({ all: 4 }), containerBackground(c.surface, 'widget'), widgetURL('punchcard://clock')]}>
        <VStack alignment="leading" spacing={4}>
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(c.textSecondary)]}>TODAY</Text>
          {total}
          {running}
        </VStack>
        <Spacer />
        {props.lastClientId && !props.runningClientName ? (
          <Link destination={`punchcard://clock?start=${props.lastClientId}`}>
            <VStack alignment="trailing" spacing={2}>
              <Text modifiers={[font({ size: 12 }), foregroundStyle(c.textSecondary)]}>Start</Text>
              <Text modifiers={[font({ size: 15, weight: 'semibold' }), lineLimit(2), foregroundStyle(c.accent)]}>
                {props.lastClientName ?? 'Last job'}
              </Text>
            </VStack>
          </Link>
        ) : null}
      </HStack>
    );
  }

  // systemSmall (default): a single tap target that opens the Clock tab.
  return (
    <VStack
      alignment="leading"
      spacing={4}
      modifiers={[padding({ all: 2 }), containerBackground(c.surface, 'widget'), widgetURL('punchcard://clock')]}
    >
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(c.textSecondary)]}>TODAY</Text>
      {total}
      <Spacer />
      {running}
    </VStack>
  );
};

export default createWidget<TodayWidgetProps>('TodayWidget', TodayWidget);
