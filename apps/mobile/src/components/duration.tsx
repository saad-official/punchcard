import { compactDuration, spokenDuration } from '@/constants/format';

import { AppText, type AppTextProps } from './app-text';

/** "6h 05m" in tabular figures; read aloud as "6 hours 5 minutes". */
export function Duration({ seconds, ...props }: Omit<AppTextProps, 'children'> & { seconds: number }) {
  return (
    <AppText tabular accessibilityLabel={spokenDuration(seconds)} {...props}>
      {compactDuration(seconds)}
    </AppText>
  );
}
