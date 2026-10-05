import { router } from 'expo-router';
import { useState } from 'react';

import { FormField, TextField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SectionFooter } from '@/components/section-header';
import { showToast } from '@/components/toast';
import { getPreferences, setPreferences } from '@/hooks/use-preferences';
import * as haptics from '@/native/haptics';

/** Business name and contact printed on branded (Pro) PDF timesheets. */
export function BusinessScreen() {
  const [initial] = useState(getPreferences);
  const [name, setName] = useState(initial.businessName);
  const [phone, setPhone] = useState(initial.businessPhone);
  const [email, setEmail] = useState(initial.businessEmail);
  const emailInvalid = !!email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim());
  const dirty = name !== initial.businessName || phone !== initial.businessPhone || email !== initial.businessEmail;

  const save = () => {
    if (emailInvalid) {
      haptics.warning();
      return;
    }
    setPreferences({ businessName: name.trim(), businessPhone: phone.trim(), businessEmail: email.trim() });
    haptics.success();
    showToast({ message: 'Business details saved' });
    router.back();
  };

  return (
    <Screen>
      <FormField label="Business name">
        <TextField value={name} onChangeText={setName} placeholder="e.g. Harbour Plumbing" autoCapitalize="words" maxLength={120} accessibilityLabel="Business name" />
      </FormField>
      <FormField label="Phone">
        <TextField value={phone} onChangeText={setPhone} placeholder="Optional" keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" maxLength={40} accessibilityLabel="Phone" />
      </FormField>
      <FormField label="Email" error={emailInvalid ? 'That email address looks incomplete.' : null}>
        <TextField
          value={email}
          onChangeText={setEmail}
          placeholder="Optional"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          autoCapitalize="none"
          maxLength={120}
          accessibilityLabel="Email"
          invalid={emailInvalid}
        />
      </FormField>
      <SectionFooter>Shown in the header of branded PDF timesheets. Stored on this phone only.</SectionFooter>
      <PrimaryButton title="Save" size="lg" disabled={!dirty} onPress={save} />
    </Screen>
  );
}
