import { Redirect } from 'expo-router';

/** `/` opens the Clock tab (deep links use `punchcard://clock`). */
export default function Index() {
  return <Redirect href="/clock" />;
}
