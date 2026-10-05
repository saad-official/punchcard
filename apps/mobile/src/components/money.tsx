import { money } from '@/constants/format';

import { AppText, type AppTextProps } from './app-text';

/** Currency amount from integer minor units, tabular figures, selectable. */
export function Money({ cents, currency, ...props }: Omit<AppTextProps, 'children'> & { cents: number; currency: string }) {
  return (
    <AppText tabular selectable {...props}>
      {money(cents, currency)}
    </AppText>
  );
}
