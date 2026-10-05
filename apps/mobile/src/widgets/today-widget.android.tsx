'use no memo';
// Android home-screen widget (react-native-android-widget). These components are called as
// plain functions to build a RemoteViews tree, so the React Compiler must stay off (above)
// and no hooks may be used. Never pass `null`/`false` children: the tree builder cannot skip them.
import { FlexWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

export const TODAY_WIDGET_NAMES = ['TodayWidget', 'TodayWidgetWide'] as const;

export type AndroidWidgetPalette = {
  surface: ColorProp;
  text: ColorProp;
  textSecondary: ColorProp;
  accent: ColorProp;
};

export type TodayWidgetAndroidProps = {
  todayLabel: string;
  runningLabel: string | null;
  runningColorHex: ColorProp | null;
  lastClientId: string | null;
  lastClientName: string | null;
  /** True for the 4×2 layout (shows the "start last job" button). */
  wide: boolean;
  palette: AndroidWidgetPalette;
};

export function TodayWidgetAndroid(props: TodayWidgetAndroidProps) {
  const { palette: c } = props;
  const status = (
    <TextWidget
      text={props.runningLabel ?? 'Not clocked in'}
      maxLines={1}
      truncate="END"
      style={{ fontSize: 13, fontWeight: props.runningLabel ? '600' : 'normal', color: props.runningColorHex ?? c.textSecondary }}
    />
  );
  const summary = (
    <FlexWidget style={{ flexDirection: 'column', flex: 1, flexGap: 2 }} clickAction="OPEN_URI" clickActionData={{ uri: 'punchcard://clock' }}>
      <TextWidget text="TODAY" style={{ fontSize: 11, fontWeight: '600', color: c.textSecondary, letterSpacing: 0.08 }} />
      <TextWidget text={props.todayLabel} style={{ fontSize: props.wide ? 34 : 26, fontWeight: 'bold', color: c.text }} />
      {status}
    </FlexWidget>
  );

  const showStart = props.wide && !props.runningLabel && !!props.lastClientId;
  const start = (
    <FlexWidget
      clickAction={showStart ? 'START_LAST' : 'OPEN_APP'}
      clickActionData={{ clientId: props.lastClientId ?? '' }}
      style={{
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: c.accent,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        height: 'match_parent',
      }}
    >
      <TextWidget text="Start" style={{ fontSize: 12, color: c.surface }} />
      <TextWidget
        text={props.lastClientName ?? 'Last job'}
        maxLines={2}
        truncate="END"
        style={{ fontSize: 15, fontWeight: 'bold', color: c.surface, textAlign: 'center' }}
      />
    </FlexWidget>
  );

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        flexGap: 12,
        padding: 14,
        borderRadius: 20,
        backgroundColor: c.surface,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'punchcard://clock' }}
      accessibilityLabel={`Today ${props.todayLabel}. ${props.runningLabel ?? 'Not clocked in'}`}
    >
      {showStart ? [summary, start] : [summary]}
    </FlexWidget>
  );
}
