import type { EntryWithClient } from '@/data';

export type EntryItemProps = {
  entry: EntryWithClient;
  seconds: number;
  earningsCents: number;
  showClient?: boolean;
  /** Android: long-press opens the screen's action sheet for this entry. */
  onLongPress?: (entry: EntryWithClient) => void;
};
