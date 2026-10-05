import { elapsedSeconds } from '@punchcard/shared';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { DateField } from '@/components/date-field';
import { EmptyState } from '@/components/empty-state';
import { FormField, TextField } from '@/components/form-field';
import { FormSheet } from '@/components/form-sheet';
import { IconButton } from '@/components/icon-button';
import { PrimaryButton } from '@/components/primary-button';
import { Select } from '@/components/select';
import { showToast } from '@/components/toast';
import { dayKeyToDate } from '@/components/week-strip';
import { compactDuration } from '@/constants/format';
import { addManualEntry, addPhoto, getEntry, removePhoto, updateEntry, type Entry } from '@/data';
import { useClients, useJobs } from '@/hooks/use-clients';
import { useEntryPhotos } from '@/hooks/use-entries';
import * as haptics from '@/native/haptics';
import { radius, spacing, touchTarget, useTheme } from '@/theme';

// Thumbnail edge: two touch targets wide reads as a photo, not an icon.
const THUMB = touchTarget * 2;

const NO_JOB = '__none__';

type Draft = {
  clientId: string;
  jobId: string;
  start: Date;
  end: Date | null;
  breakMinutes: string;
  note: string;
  mileage: string;
  editedNote: string;
};

function initialDraft(entry: Entry | null, day: string | undefined, fallbackClientId: string): Draft {
  if (entry) {
    return {
      clientId: entry.clientId,
      jobId: entry.jobId ?? NO_JOB,
      start: new Date(entry.startedAt),
      end: entry.endedAt ? new Date(entry.endedAt) : null,
      breakMinutes: String(Math.round(entry.breakSeconds / 60)),
      note: entry.note ?? '',
      mileage: entry.mileageKm != null ? String(entry.mileageKm) : '',
      editedNote: '',
    };
  }
  const base = day ? dayKeyToDate(day) : new Date();
  const start = new Date(base);
  start.setHours(8, 0, 0, 0);
  const end = new Date(base);
  end.setHours(12, 0, 0, 0);
  return { clientId: fallbackClientId, jobId: NO_JOB, start, end, breakMinutes: '0', note: '', mileage: '', editedNote: '' };
}

const parseNumber = (s: string) => {
  const n = Number(s.replace(',', '.').trim());
  return s.trim() === '' ? null : Number.isFinite(n) ? n : NaN;
};

/** Add a manual entry (`?day=YYYY-MM-DD`) or edit one (`?id=`); edits require an audit note. */
export function EntryEditorSheet() {
  const { id, day } = useLocalSearchParams<{ id?: string; day?: string }>();
  const clients = useClients();
  const [original] = useState(() => {
    const e = id ? getEntry(id) : null;
    return e && !e.deletedAt ? e : null;
  });
  const [draft, setDraft] = useState<Draft>(() => initialDraft(original, day, clients[0]?.id ?? ''));
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const jobs = useJobs(draft.clientId || null);
  const photos = useEntryPhotos(original?.id);
  const { colors } = useTheme();

  const editing = !!original;
  const running = editing && !original.endedAt;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  if (id && !original) {
    return (
      <FormSheet title="Entry">
        <EmptyState icon={{ sf: 'questionmark.folder', md: 'help' }} title="This entry no longer exists" body="It may have been deleted on another screen." />
      </FormSheet>
    );
  }
  if (!clients.length) {
    return (
      <FormSheet title="Add entry">
        <EmptyState
          icon={{ sf: 'person.crop.circle.badge.plus', md: 'person_add' }}
          title="Add a client first"
          body="Every entry belongs to a client so it lands on the right timesheet."
          action={<PrimaryButton title="Add client" onPress={() => router.replace('/client-editor')} />}
        />
      </FormSheet>
    );
  }

  const breakMin = parseNumber(draft.breakMinutes) ?? 0;
  const mileage = parseNumber(draft.mileage);
  const grossSeconds = draft.end ? Math.floor((draft.end.getTime() - draft.start.getTime()) / 1000) : null;
  const errors = {
    client: !draft.clientId ? 'Choose a client.' : null,
    end: grossSeconds !== null && grossSeconds <= 0 ? 'End must be after the start.' : null,
    break:
      !Number.isFinite(breakMin) || breakMin < 0
        ? 'Break must be a number of minutes.'
        : grossSeconds !== null && breakMin * 60 >= grossSeconds && grossSeconds > 0
          ? 'Break is longer than the entry.'
          : null,
    mileage: mileage !== null && (!Number.isFinite(mileage) || mileage < 0) ? 'Mileage must be a positive number.' : null,
    editedNote: editing && !draft.editedNote.trim() ? 'Say why this changed. It is printed on exports.' : null,
  };
  const valid = !Object.values(errors).some(Boolean);
  const shown = (e: string | null) => (submitted ? e : null);
  const workedSeconds =
    grossSeconds !== null ? Math.max(0, grossSeconds - Math.round(breakMin * 60)) : original ? elapsedSeconds(original, new Date().toISOString()) : 0;

  const save = () => {
    setSubmitted(true);
    if (!valid) {
      haptics.warning();
      return;
    }
    const common = {
      clientId: draft.clientId,
      jobId: draft.jobId === NO_JOB ? null : draft.jobId,
      breakSeconds: Math.round(breakMin * 60),
      note: draft.note.trim(),
      mileageKm: mileage,
    };
    try {
      if (original) {
        updateEntry(
          original.id,
          running ? { ...common, startedAt: draft.start } : { ...common, startedAt: draft.start, endedAt: draft.end },
          draft.editedNote.trim(),
        );
        showToast({ message: 'Entry updated' });
      } else {
        const entry = addManualEntry({ ...common, startedAt: draft.start, endedAt: draft.end ?? draft.start });
        for (const uri of pendingPhotos) addPhoto(entry.id, uri);
        showToast({ message: `Added ${compactDuration(workedSeconds)}` });
      }
      haptics.success();
      router.back();
    } catch (error) {
      haptics.warning();
      setFormError(error instanceof Error ? error.message : 'Could not save this entry.');
    }
  };

  const pick = async (source: 'camera' | 'library') => {
    setFormError(null);
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setFormError('Camera access is off for Punchcard. Turn it on in the Settings app.');
          return;
        }
      }
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: true, selectionLimit: 6 });
      if (result.canceled) return;
      const uris = result.assets.map((a) => a.uri);
      if (original) uris.forEach((uri) => addPhoto(original.id, uri));
      else setPendingPhotos((p) => [...p, ...uris]);
      haptics.tapLight();
    } catch {
      setFormError('Could not add that photo.');
    }
  };

  const thumbs = original
    ? photos.map((p) => ({ key: p.id, uri: p.localUri, remove: () => removePhoto(p.id) }))
    : pendingPhotos.map((uri, i) => ({ key: `${i}:${uri}`, uri, remove: () => setPendingPhotos((list) => list.filter((u) => u !== uri)) }));

  return (
    <FormSheet title={editing ? 'Edit entry' : 'Add entry'} primaryLabel={editing ? 'Save' : 'Add'} onPrimary={save} error={formError}>
      <FormField label="Client" error={shown(errors.client)}>
        <Select
          accessibilityLabel="Client"
          value={draft.clientId}
          options={clients.map((c) => ({ label: c.name, value: c.id }))}
          onChange={(v) => setDraft((d) => ({ ...d, clientId: v, jobId: NO_JOB }))}
        />
      </FormField>

      {jobs.length ? (
        <FormField label="Job">
          <Select
            accessibilityLabel="Job"
            value={draft.jobId}
            options={[{ label: 'No job', value: NO_JOB }, ...jobs.map((j) => ({ label: j.name, value: j.id }))]}
            onChange={(v) => set('jobId', v)}
          />
        </FormField>
      ) : null}

      <View style={{ gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceElevated }}>
        <Row label="Date">
          <DateField
            mode="date"
            accessibilityLabel="Date"
            value={draft.start}
            maximumDate={new Date()}
            onChange={(d) => {
              const shift = d.getTime() - draft.start.getTime();
              setDraft((x) => ({ ...x, start: d, end: x.end ? new Date(x.end.getTime() + shift) : null }));
            }}
          />
        </Row>
        <Row label="Start">
          <DateField mode="time" accessibilityLabel="Start time" value={draft.start} onChange={(d) => set('start', d)} />
        </Row>
        {draft.end ? (
          <Row label="End">
            <DateField
              mode="time"
              accessibilityLabel="End time"
              value={draft.end}
              onChange={(d) => {
                // An end before the start means the job ran past midnight.
                const next = d.getTime() <= draft.start.getTime() ? new Date(d.getTime() + 86_400_000) : d;
                set('end', next);
              }}
            />
          </Row>
        ) : (
          <Row label="End">
            <AppText variant="body" tone="accent" weight="600">
              Running
            </AppText>
          </Row>
        )}
        <Row label="Worked">
          <AppText variant="body" weight="600" tabular>
            {compactDuration(workedSeconds)}
          </AppText>
        </Row>
      </View>
      {shown(errors.end) ? (
        <AppText variant="caption" tone="danger">
          {errors.end}
        </AppText>
      ) : null}

      <FormField label="Break (minutes)" error={shown(errors.break)}>
        <TextField
          value={draft.breakMinutes}
          onChangeText={(t) => set('breakMinutes', t)}
          keyboardType="number-pad"
          inputMode="numeric"
          placeholder="0"
          accessibilityLabel="Break in minutes"
          invalid={!!shown(errors.break)}
        />
      </FormField>

      <FormField label="Note" hint="Shown on the timesheet your client receives.">
        <TextField
          value={draft.note}
          onChangeText={(t) => set('note', t)}
          multiline
          maxLength={2000}
          placeholder="What got done"
          accessibilityLabel="Note"
        />
      </FormField>

      <FormField label="Mileage (km)" error={shown(errors.mileage)}>
        <TextField
          value={draft.mileage}
          onChangeText={(t) => set('mileage', t)}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="Optional"
          accessibilityLabel="Mileage in kilometres"
          invalid={!!shown(errors.mileage)}
        />
      </FormField>

      <FormField label="Photos">
        {thumbs.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {thumbs.map((t, i) => (
              <View key={t.key}>
                <Image
                  source={{ uri: t.uri }}
                  style={{ width: THUMB, height: THUMB, borderRadius: radius.sm }}
                  contentFit="cover"
                  accessibilityLabel={`Photo ${i + 1}`}
                />
                <IconButton
                  sf="xmark"
                  md="close"
                  size={28}
                  variant="filled"
                  accessibilityLabel={`Remove photo ${i + 1}`}
                  onPress={t.remove}
                  style={{ position: 'absolute', top: -spacing.xs, end: -spacing.xs }}
                />
              </View>
            ))}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <PrimaryButton title="Take photo" variant="secondary" icon={{ sf: 'camera', md: 'photo_camera' }} style={{ flex: 1 }} onPress={() => pick('camera')} />
          <PrimaryButton title="Choose" variant="secondary" icon={{ sf: 'photo.on.rectangle', md: 'photo_library' }} style={{ flex: 1 }} onPress={() => pick('library')} />
        </View>
      </FormField>

      {editing ? (
        <FormField label="Reason for change" error={shown(errors.editedNote)} hint="Required. Printed on exports next to this entry.">
          <TextField
            value={draft.editedNote}
            onChangeText={(t) => set('editedNote', t)}
            maxLength={500}
            placeholder="e.g. Forgot to stop the clock"
            accessibilityLabel="Reason for change"
            invalid={!!shown(errors.editedNote)}
          />
        </FormField>
      ) : null}
    </FormSheet>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, minHeight: touchTarget }}>
      <AppText variant="body">{label}</AppText>
      {children}
    </View>
  );
}
