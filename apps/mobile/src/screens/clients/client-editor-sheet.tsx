import { Host, Slider, Switch } from '@expo/ui';
import { canAddClient, CLIENT_PALETTE, formatCoordinates, gate, minorUnitDigits, type ClientColor } from '@punchcard/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { FormField, TextField } from '@/components/form-field';
import { FormSheet } from '@/components/form-sheet';
import { Icon } from '@/components/icon';
import { PrimaryButton } from '@/components/primary-button';
import { openPaywall, ProBadge } from '@/components/pro-badge';
import { Select } from '@/components/select';
import { SwatchPicker } from '@/components/swatch-picker';
import { showToast } from '@/components/toast';
import { currencyOptions, GEOFENCE_RADIUS } from '@/constants/app';
import { countActiveClients, createClient, getClient, listGeofencedClients, updateClient, type Client } from '@/data';
import { useClients } from '@/hooks/use-clients';
import { useSettings } from '@/hooks/use-settings';
import { currentPosition, geocodeAddress, GeocodeError, type GeocodedPlace } from '@/native/geocode';
import { requestAlwaysPermission, syncGeofences } from '@/native/geofence';
import * as haptics from '@/native/haptics';
import { usePlan } from '@/native/purchases';
import { radius, spacing, useTheme } from '@/theme';

const SWATCHES = CLIENT_PALETTE.map((s) => ({ id: s.name, hex: s.hex, label: s.name[0].toUpperCase() + s.name.slice(1) }));

function centsToInput(cents: number, currency: string): string {
  const digits = minorUnitDigits(currency);
  return digits === 0 ? String(cents) : (cents / 10 ** digits).toFixed(digits);
}

function inputToCents(text: string, currency: string): number | null {
  const n = Number(text.replace(',', '.').trim());
  if (!text.trim() || !Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 10 ** minorUnitDigits(currency));
}

/** A resolved site pin; `query` is the address text it was resolved for (stale once edited). */
type SitePin = GeocodedPlace & { query: string };

type SiteError = { message: string; openSettings: boolean };

function siteErrorFrom(error: unknown): SiteError {
  if (error instanceof GeocodeError) {
    return { message: error.message, openSettings: error.reason === 'permission' && !error.canAskAgain };
  }
  return { message: "Couldn't look that up. Try again.", openSettings: false };
}

/** New client (`/client-editor`) or edit (`/client-editor?id=`). */
export function ClientEditorSheet() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const settings = useSettings();
  const plan = usePlan();
  const clients = useClients();
  const { colors, scheme } = useTheme();
  const [original] = useState<Client | null>(() => (id ? getClient(id) : null));
  const usedColors = new Set(clients.map((c) => c.color));
  const [name, setName] = useState(original?.name ?? '');
  const [color, setColor] = useState<ClientColor>(
    original?.color ?? CLIENT_PALETTE.find((s) => !usedColors.has(s.name))?.name ?? 'orange',
  );
  const [currency, setCurrency] = useState(original?.currency ?? settings.currency);
  const [rate, setRate] = useState(original ? centsToInput(original.hourlyRateCents, original.currency) : '');
  const [address, setAddress] = useState(original?.address ?? '');
  const [site, setSite] = useState<SitePin | null>(() =>
    original && original.lat != null && original.lng != null
      ? {
          lat: original.lat,
          lng: original.lng,
          label: original.address || formatCoordinates(original.lat, original.lng),
          query: original.address ?? '',
        }
      : null,
  );
  const [locating, setLocating] = useState<'address' | 'here' | null>(null);
  const [siteError, setSiteError] = useState<SiteError | null>(null);
  const [fenceOn, setFenceOn] = useState(!!original?.geofenceRadiusM);
  const [fenceRadius, setFenceRadius] = useState(original?.geofenceRadiusM ?? GEOFENCE_RADIUS.default);
  const [permissionNote, setPermissionNote] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canGeofence = gate(plan, 'geofences');
  const rateCents = inputToCents(rate, currency);
  const errors = {
    name: !name.trim() ? 'Give the client a name.' : null,
    rate: rateCents === null ? 'Enter an hourly rate (0 is fine for unpaid work).' : null,
  };
  const valid = !errors.name && !errors.rate;

  if (id && !original) {
    return (
      <FormSheet title="Client">
        <EmptyState icon={{ sf: 'person.crop.circle.badge.questionmark', md: 'person_off' }} title="Client not found" />
      </FormSheet>
    );
  }
  if (!original && !canAddClient(plan, countActiveClients())) {
    return (
      <FormSheet title="New client">
        <EmptyState
          icon={{ sf: 'person.2.fill', md: 'group' }}
          title="Free covers 3 clients"
          body="Archive a client you no longer work for, or go Pro for unlimited clients."
          action={<PrimaryButton title="See Pro" onPress={() => router.replace({ pathname: '/paywall', params: { reason: 'clients' } })} />}
        />
      </FormSheet>
    );
  }

  const toggleFence = async (on: boolean) => {
    if (!canGeofence) {
      openPaywall('geofence');
      return;
    }
    setFenceOn(on);
    setPermissionNote(null);
    if (!on) return;
    const p = await requestAlwaysPermission();
    if (p.status === 'granted') return;
    setPermissionNote(
      p.status === 'foreground-only'
        ? 'Reminders need location set to "Always" so they work while Punchcard is closed.'
        : p.status === 'services-disabled'
          ? 'Location services are off on this phone.'
          : 'Location access is off for Punchcard.',
    );
  };

  const findAddress = async () => {
    const query = address.trim();
    if (!query || locating) return;
    setLocating('address');
    setSiteError(null);
    try {
      const place = await geocodeAddress(query);
      if (place) {
        haptics.tapLight();
        setSite({ ...place, query });
      } else {
        haptics.warning();
        setSiteError({ message: 'No match for that address. Add the suburb or postcode, or use your current location.', openSettings: false });
      }
    } catch (error) {
      haptics.warning();
      setSiteError(siteErrorFrom(error));
    } finally {
      setLocating(null);
    }
  };

  const pinCurrentLocation = async () => {
    if (locating) return;
    setLocating('here');
    setSiteError(null);
    try {
      const place = await currentPosition();
      const hasStreetLabel = place.label !== formatCoordinates(place.lat, place.lng);
      // Fill an empty address so timesheets show where the site is.
      const fill = !address.trim() && hasStreetLabel;
      if (fill) setAddress(place.label);
      haptics.tapLight();
      setSite({ ...place, query: fill ? place.label : address.trim() });
    } catch (error) {
      haptics.warning();
      setSiteError(siteErrorFrom(error));
    } finally {
      setLocating(null);
    }
  };

  const siteStale = !!site && address.trim() !== site.query;

  const save = () => {
    setSubmitted(true);
    if (!valid || rateCents === null) {
      haptics.warning();
      return;
    }
    const input = {
      name: name.trim(),
      color,
      hourlyRateCents: rateCents,
      currency,
      address: address.trim() || null,
      lat: site?.lat ?? null,
      lng: site?.lng ?? null,
      geofenceRadiusM: canGeofence && fenceOn ? Math.round(fenceRadius) : null,
    };
    try {
      if (original) updateClient(original.id, input);
      else createClient(input);
      if (canGeofence) syncGeofences(listGeofencedClients(), plan).catch(() => undefined);
      haptics.success();
      showToast({ message: original ? 'Client updated' : `Added ${input.name}` });
      router.back();
    } catch (error) {
      haptics.warning();
      setFormError(error instanceof Error ? error.message : 'Could not save this client.');
    }
  };

  return (
    <FormSheet title={original ? 'Edit client' : 'New client'} primaryLabel={original ? 'Save' : 'Add'} onPrimary={save} error={formError}>
      <FormField label="Name" error={submitted ? errors.name : null}>
        <TextField
          value={name}
          onChangeText={setName}
          placeholder="e.g. Smith kitchen"
          autoFocus={!original}
          autoCapitalize="words"
          maxLength={120}
          returnKeyType="next"
          accessibilityLabel="Client name"
          invalid={submitted && !!errors.name}
        />
      </FormField>

      <FormField label="Colour" hint="Shown as a thin bar next to this client's time.">
        <SwatchPicker swatches={SWATCHES} value={color} onChange={(c) => setColor(c as ClientColor)} />
      </FormField>

      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <FormField label="Hourly rate" error={submitted ? errors.rate : null}>
            <TextField
              value={rate}
              onChangeText={setRate}
              placeholder="65.00"
              keyboardType="decimal-pad"
              inputMode="decimal"
              accessibilityLabel={`Hourly rate in ${currency}`}
              invalid={submitted && !!errors.rate}
            />
          </FormField>
        </View>
        <FormField label="Currency">
          <Select
            accessibilityLabel="Currency"
            value={currency}
            options={currencyOptions(currency).map((c) => ({ label: c, value: c }))}
            onChange={setCurrency}
          />
        </FormField>
      </View>

      <FormField label="Site address" hint="Optional. Printed on timesheets; find it to pin the job site.">
        <TextField
          value={address}
          onChangeText={setAddress}
          placeholder="12 Harbour St"
          autoCapitalize="words"
          maxLength={300}
          returnKeyType="search"
          onSubmitEditing={() => void findAddress()}
          accessibilityLabel="Site address"
        />
      </FormField>

      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <PrimaryButton
            title="Find address"
            variant="secondary"
            size="sm"
            block={false}
            icon={{ sf: 'magnifyingglass', md: 'search' }}
            loading={locating === 'address'}
            disabled={!address.trim() || locating !== null}
            accessibilityHint="Looks up the address and pins the job site"
            onPress={() => void findAddress()}
          />
          <PrimaryButton
            title="Use my current location"
            variant="ghost"
            size="sm"
            block={false}
            icon={{ sf: 'location', md: 'my_location' }}
            loading={locating === 'here'}
            disabled={locating !== null}
            accessibilityHint="Pins the job site where you are standing"
            onPress={() => void pinCurrentLocation()}
          />
        </View>

        {siteError ? (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="caption" tone="warning" selectable>
              {siteError.message}
            </AppText>
            {siteError.openSettings ? (
              <PrimaryButton title="Open Settings" variant="secondary" size="sm" block={false} onPress={() => Linking.openSettings()} />
            ) : null}
          </View>
        ) : null}

        {site ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.md,
              borderRadius: radius.md,
              borderCurve: 'continuous',
              backgroundColor: colors.surfaceElevated,
            }}
          >
            <Icon sf="mappin.and.ellipse" md="location_on" color={colors.accentText} />
            <View style={{ flex: 1, gap: spacing.xs }} accessible accessibilityLabel={`Job site pinned at ${site.label}`}>
              <AppText variant="callout" weight="600" numberOfLines={2} selectable>
                {site.label}
              </AppText>
              <AppText variant="caption" tone={siteStale ? 'warning' : 'secondary'} tabular={!siteStale} selectable>
                {siteStale ? 'Address changed. Find it again to move the pin.' : formatCoordinates(site.lat, site.lng)}
              </AppText>
            </View>
            <PrimaryButton
              title="Remove"
              variant="ghost"
              size="sm"
              block={false}
              accessibilityHint="Removes the job-site pin"
              onPress={() => {
                setSite(null);
                haptics.tapLight();
              }}
            />
          </View>
        ) : null}
      </View>

      <View style={{ gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.surfaceElevated }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <AppText variant="body" weight="600">
                Job-site reminders
              </AppText>
              {canGeofence ? null : <ProBadge reason="geofence" />}
            </View>
            <AppText variant="caption" tone="secondary">
              A nudge to start when you arrive and to stop when you leave, even with the app closed.
            </AppText>
          </View>
          <Host matchContents seedColor={colors.accent} colorScheme={scheme}>
            <Switch value={canGeofence && fenceOn} onValueChange={(v) => void toggleFence(v)} />
          </Host>
        </View>
        {canGeofence && fenceOn ? (
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="callout" tone="secondary">
                Radius
              </AppText>
              <AppText variant="callout" weight="600" tabular>{`${Math.round(fenceRadius)} m`}</AppText>
            </View>
            <Host matchContents={{ vertical: true }} seedColor={colors.accent} colorScheme={scheme} style={{ alignSelf: 'stretch' }}>
              <Slider
                value={fenceRadius}
                min={GEOFENCE_RADIUS.min}
                max={GEOFENCE_RADIUS.max}
                step={GEOFENCE_RADIUS.step}
                onValueChange={setFenceRadius}
              />
            </Host>
            {site ? null : (
              <AppText variant="caption" tone="secondary">
                Pin the site above (Find address or Use my current location) so reminders know where it is.
              </AppText>
            )}
            {permissionNote ? (
              <View style={{ gap: spacing.sm }}>
                <AppText variant="caption" tone="warning">
                  {permissionNote}
                </AppText>
                <PrimaryButton title="Open Settings" variant="secondary" size="sm" block={false} onPress={() => Linking.openSettings()} />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </FormSheet>
  );
}
