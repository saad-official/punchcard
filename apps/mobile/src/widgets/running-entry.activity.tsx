// iOS Live Activity for the running entry (Lock Screen banner + Dynamic Island).
//
// The function marked 'widget' is stringified at build time and evaluated in the widget
// extension's isolated runtime: it may only use @expo/ui/swift-ui components/modifiers
// (as globals, so keep the imported names unaliased), its props, and the environment.
// No hooks, no imports of app code, no outer-scope constants. Props are JSON, so dates
// travel as epoch milliseconds.
import { Button, HStack, Image, RoundedRectangle, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

export type ActivityPalette = { surface: string; text: string; textSecondary: string; accent: string };

export type RunningEntryActivityProps = {
  entryId: string;
  clientName: string;
  jobName: string | null;
  clientColorHex: string;
  /**
   * Timer origin in epoch ms: `startedAt + breakSeconds`, so the native SwiftUI timer
   * (`Text(timerInterval:)`) shows worked time and keeps ticking with the app suspended.
   */
  timerStartMs: number;
  /** Epoch ms when the current break started (timer appears paused), or null. */
  pausedAtMs: number | null;
  /** Earnings at the last app update, e.g. "$78.40" (refreshed while the app is alive). */
  earningsText: string;
  /** e.g. "$65/h" */
  rateText: string;
  palette: { light: ActivityPalette; dark: ActivityPalette };
};

const RunningEntryActivity = (props: RunningEntryActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const c = environment.colorScheme === 'dark' ? props.palette.dark : props.palette.light;
  const onBreak = props.pausedAtMs != null;
  const timer = {
    lower: new Date(props.timerStartMs),
    upper: new Date(props.timerStartMs + 7 * 24 * 3600 * 1000),
  };
  const pauseTime = onBreak ? new Date(props.pausedAtMs as number) : undefined;
  const subtitle = onBreak ? 'On break' : (props.jobName ?? props.rateText);

  const elapsed = (size: number) => (
    <Text
      timerInterval={timer}
      countsDown={false}
      pauseTime={pauseTime}
      modifiers={[font({ size, weight: 'semibold' }), monospacedDigit(), foregroundStyle(c.text)]}
    />
  );

  const buttons = (
    <HStack spacing={8}>
      <Button
        target="break"
        label={onBreak ? 'Resume' : 'Break'}
        systemImage={onBreak ? 'play.fill' : 'cup.and.saucer.fill'}
        modifiers={[foregroundStyle(c.text)]}
      />
      <Button target="stop" label="Stop" systemImage="stop.fill" modifiers={[foregroundStyle(c.accent)]} />
    </HStack>
  );

  return {
    banner: (
      <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 16 }), activityBackgroundTint(c.surface)]}>
        <HStack spacing={10}>
          <RoundedRectangle cornerRadius={2} modifiers={[frame({ width: 4, height: 40 }), foregroundStyle(props.clientColorHex)]} />
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 17, weight: 'semibold' }), lineLimit(1), foregroundStyle(c.text)]}>
              {props.clientName}
            </Text>
            <Text modifiers={[font({ size: 13 }), lineLimit(1), foregroundStyle(c.textSecondary)]}>{subtitle}</Text>
          </VStack>
          <Spacer />
          <VStack alignment="trailing" spacing={2}>
            {elapsed(28)}
            <Text modifiers={[font({ size: 13 }), monospacedDigit(), foregroundStyle(c.textSecondary)]}>
              {props.earningsText}
            </Text>
          </VStack>
        </HStack>
        {buttons}
      </VStack>
    ),
    compactLeading: <Image systemName={onBreak ? 'pause.circle.fill' : 'clock.fill'} color={props.clientColorHex} />,
    compactTrailing: (
      <Text
        timerInterval={timer}
        countsDown={false}
        pauseTime={pauseTime}
        modifiers={[monospacedDigit(), frame({ width: 56 }), foregroundStyle(props.clientColorHex)]}
      />
    ),
    minimal: <Image systemName={onBreak ? 'pause.circle.fill' : 'clock.fill'} color={props.clientColorHex} />,
    expandedLeading: (
      <VStack alignment="leading" spacing={2} modifiers={[padding({ leading: 4 })]}>
        <Text modifiers={[font({ size: 15, weight: 'semibold' }), lineLimit(1)]}>{props.clientName}</Text>
        <Text modifiers={[font({ size: 12 }), lineLimit(1), foregroundStyle(props.clientColorHex)]}>{subtitle}</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={2} modifiers={[padding({ trailing: 4 })]}>
        <Text
          timerInterval={timer}
          countsDown={false}
          pauseTime={pauseTime}
          modifiers={[font({ size: 22, weight: 'semibold' }), monospacedDigit()]}
        />
        <Text modifiers={[font({ size: 12 }), monospacedDigit()]}>{props.earningsText}</Text>
      </VStack>
    ),
    expandedBottom: buttons,
  };
};

export default createLiveActivity<RunningEntryActivityProps>('RunningEntry', RunningEntryActivity);
