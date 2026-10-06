import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { FormField, TextField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { showToast } from '@/components/toast';
import { authClient, authedFetch } from '@/data/auth-client';
import * as haptics from '@/native/haptics';
import { registerForPushNotifications } from '@/native/notifications';
import { logIn } from '@/native/purchases';
import { radius, spacing, useTheme } from '@/theme';

type Mode = 'sign-in' | 'sign-up';

/** Best effort after sign-in: link purchases to the account and register this phone for pushes. */
async function afterSignIn(userId: string) {
  await logIn(userId).catch(() => undefined);
  const push = await registerForPushNotifications().catch(() => null);
  if (push?.ok) {
    await authedFetch('/api/devices', {
      method: 'POST',
      body: { token: push.token, platform: process.env.EXPO_OS === 'ios' ? 'ios' : 'android' },
    }).catch(() => undefined);
  }
}

export function AccountScreen() {
  const { colors, scheme } = useTheme();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const passwordOk = password.length >= 8;
  const canSubmit = emailOk && passwordOk && (mode === 'sign-in' || name.trim().length > 0);

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === 'sign-in'
          ? await authClient.signIn.email({ email: email.trim(), password })
          : await authClient.signUp.email({ email: email.trim(), password, name: name.trim() });
      if (res.error) {
        haptics.warning();
        setError(res.error.message ?? (mode === 'sign-in' ? 'Email or password is incorrect.' : 'Could not create the account.'));
        return;
      }
      const userId = res.data?.user?.id;
      if (userId) void afterSignIn(userId);
      haptics.success();
      showToast({ message: mode === 'sign-in' ? 'Signed in' : 'Account created' });
      router.back();
    } catch {
      haptics.warning();
      setError("Couldn't reach Punchcard. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <SegmentedControl
        values={['Sign in', 'Create account']}
        selectedIndex={mode === 'sign-in' ? 0 : 1}
        onChange={(e) => {
          setError(null);
          setMode(e.nativeEvent.selectedSegmentIndex === 0 ? 'sign-in' : 'sign-up');
        }}
        tintColor={colors.accent}
        appearance={scheme}
      />
      <AppText variant="callout" tone="secondary">
        An account backs up your clients and hours and syncs them to other devices (Pro). Without one, Punchcard keeps working
        offline on this phone.
      </AppText>

      {mode === 'sign-up' ? (
        <FormField label="Name">
          <TextField value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" textContentType="name" autoComplete="name" accessibilityLabel="Name" />
        </FormField>
      ) : null}
      <FormField label="Email" error={email && !emailOk ? 'Enter a full email address.' : null}>
        <TextField
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          accessibilityLabel="Email"
        />
      </FormField>
      <FormField label="Password" hint={mode === 'sign-up' ? 'At least 8 characters.' : undefined} error={password && !passwordOk ? 'At least 8 characters.' : null}>
        <TextField
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          textContentType={mode === 'sign-in' ? 'password' : 'newPassword'}
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
          accessibilityLabel="Password"
        />
      </FormField>

      {error ? (
        <View style={{ padding: spacing.md, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.surfaceSunken }}>
          <AppText variant="callout" tone="danger" selectable accessibilityLiveRegion="polite">
            {error}
          </AppText>
        </View>
      ) : null}

      <PrimaryButton
        title={mode === 'sign-in' ? 'Sign in' : 'Create account'}
        size="lg"
        loading={busy}
        disabled={!canSubmit}
        onPress={() => void submit()}
      />
    </Screen>
  );
}
