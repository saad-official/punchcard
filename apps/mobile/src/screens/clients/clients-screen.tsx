import { elapsedSeconds, PLAN_LIMITS, weekRange } from '@punchcard/shared';
import { FlashList } from '@shopify/flash-list';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { HeaderActions } from '@/components/header-actions';
import { PrimaryButton } from '@/components/primary-button';
import { ProBadge } from '@/components/pro-badge';
import { deviceTimeZone, type Client } from '@/data';
import { useClients } from '@/hooks/use-clients';
import { useEntries } from '@/hooks/use-entries';
import { useNowSeconds } from '@/hooks/use-now';
import { useSettings } from '@/hooks/use-settings';
import { usePlan } from '@/native/purchases';
import { hairline, radius, spacing, touchTarget, useTheme } from '@/theme';

import { newClient } from './client-actions';
import { ClientRow } from './client-row';

type Row = { kind: 'client'; client: Client } | { kind: 'archived-toggle'; count: number };

export function ClientsScreen() {
  const plan = usePlan();
  const { weekStartsOn } = useSettings();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const all = useClients({ includeArchived: true });
  const nowIso = new Date(useNowSeconds(false) * 1000).toISOString();
  const week = weekRange(nowIso, weekStartsOn, deviceTimeZone());
  const weekEntries = useEntries({ from: week.start, to: week.end });

  const weekSeconds = new Map<string, number>();
  for (const e of weekEntries) weekSeconds.set(e.clientId, (weekSeconds.get(e.clientId) ?? 0) + elapsedSeconds(e, nowIso));

  const q = query.trim().toLowerCase();
  const matches = (c: Client) => !q || c.name.toLowerCase().includes(q) || (c.address ?? '').toLowerCase().includes(q);
  const active = all.filter((c) => !c.archivedAt);
  const archived = all.filter((c) => !!c.archivedAt);
  const rows: Row[] = [
    ...active.filter(matches).map((client) => ({ kind: 'client' as const, client })),
    ...(archived.length && !q ? [{ kind: 'archived-toggle' as const, count: archived.length }] : []),
    ...(showArchived || q ? archived.filter(matches).map((client) => ({ kind: 'client' as const, client })) : []),
  ];

  const limit = PLAN_LIMITS.free.maxClients;

  return (
    <>
      <Stack.SearchBar
        placeholder="Search clients"
        onChangeText={(e) => setQuery(e.nativeEvent.text)}
        onCancelButtonPress={() => setQuery('')}
        tintColor={colors.accentText}
        textColor={colors.text}
        hintTextColor={colors.textTertiary}
        headerIconColor={colors.text}
      />
      <HeaderActions actions={[{ key: 'new', label: 'New client', sf: 'plus', md: 'add', onPress: () => newClient(plan) }]} />
      <FlashList
        data={rows}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        style={{ backgroundColor: colors.surface }}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        keyExtractor={(r) => (r.kind === 'client' ? r.client.id : 'archived')}
        getItemType={(r) => r.kind}
        ItemSeparatorComponent={RowSeparator}
        ListHeaderComponent={
          plan === 'free' && active.length > 0 && !q ? (
            <View
              style={{
                margin: spacing.md,
                padding: spacing.md,
                borderRadius: radius.md,
                borderCurve: 'continuous',
                backgroundColor: colors.surfaceSunken,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
              }}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="callout" weight="600" tabular>
                  {`${Math.min(active.length, limit)} of ${limit} clients on Free`}
                </AppText>
                <AppText variant="caption" tone="secondary">
                  Pro removes the limit and adds job-site reminders.
                </AppText>
              </View>
              <ProBadge reason="clients" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          q ? (
            <EmptyState icon={{ sf: 'magnifyingglass', md: 'search' }} title="No matches" body={`No client name or address contains “${query.trim()}”.`} />
          ) : (
            <EmptyState
              icon={{ sf: 'person.2.fill', md: 'group' }}
              title="Your clients live here"
              body="Add each customer or site with its hourly rate and a colour you'll recognise at a glance."
              action={<PrimaryButton title="Add client" block={false} icon={{ sf: 'plus', md: 'add' }} onPress={() => newClient(plan)} />}
            />
          )
        }
        renderItem={({ item }) =>
          item.kind === 'client' ? (
            <ClientRow client={item.client} weekSeconds={weekSeconds.get(item.client.id) ?? 0} plan={plan} />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showArchived }}
              onPress={() => setShowArchived((v) => !v)}
              style={({ pressed }) => ({
                minHeight: touchTarget,
                paddingHorizontal: spacing.md,
                justifyContent: 'center',
                backgroundColor: pressed ? colors.surfaceSunken : colors.surface,
              })}
            >
              <AppText variant="callout" tone="accent" weight="600">
                {showArchived ? `Hide archived (${item.count})` : `Show archived (${item.count})`}
              </AppText>
            </Pressable>
          )
        }
      />
    </>
  );
}


/** Inset hairline aligned with the row text (past the colour bar). */
function RowSeparator() {
  const { colors } = useTheme();
  return <View style={{ height: hairline, backgroundColor: colors.separator, marginStart: spacing.md + spacing.lg }} />;
}
