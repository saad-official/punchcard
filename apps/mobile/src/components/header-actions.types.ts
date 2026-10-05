import type { IconProps } from './icon';

export type HeaderAction = Pick<IconProps, 'sf' | 'md'> & {
  key: string;
  /** Spoken label (icon-only buttons). */
  label: string;
  onPress: () => void;
  prominent?: boolean;
};

export type HeaderActionsProps = { actions: HeaderAction[] };
