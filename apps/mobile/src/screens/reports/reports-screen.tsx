import { Host, Switch } from '@expo/ui';
import {
  clientColorHex,
  formatDuration,
  gate,
  historyFloor,
  summarize,
  timesheetModel,
  toCsv,
  toCsvRows,
  weekRange,
  type ReportClient,
} from '@punchcard/shared';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { ClientBar } from '@/components/client-bar';
import { DateField } from '@/components/date-field';
import { Duration } from '@/components/duration';
import { EmptyState } from '@/components/empty-state';
import { ListGroup } from '@/components/list-row';
import { Money } from '@/components/money';
import { PrimaryButton } from '@/components/primary-button';
import { openPaywall, ProBadge } from '@/components/pro-badge';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { SegmentedControl } from '@/components/segmented-control';
import { Select } from '@/components/select';
import { showToast } from '@/components/toast';
import { formatDate, formatDayShort, LOCALE } from '@/constants/format';
import { dayRange, deviceTimeZone, type EntryWithClient } from '@/data';
import { useClients } from '@/hooks/use-clients';
import { useEntries } from '@/hooks/use-entries';
import { useNowSeconds } from '@/hooks/use-now';
import { useSettings } from '@/hooks/use-settings';
import { exportCsv, exportPdf } from '@/native/exports';
import * as haptics from '@/native/haptics';
import { usePlan } from '@/native/purchases';
import { overline, radius, spacing, useTheme } from '@/theme';

import { timesheetHtml } from './timesheet-html';

type Period = 'this-week' | 'last-week' | 'this-month' | 'custom';
const PERIODS: { id: Period; label: string }[] = [
  { id: 'this-week', label: 'This week' },
  { id: 'last-week', label: 'Last week' },
  { id: 'this-month', label: 'Month' },
  { id: 'custom', label: 'Custom' },
];
const DAY_MS = 86_400_000;
const ALL = '__all__';

function periodRange(period: Period, nowIso: string, weekStartsOn: number, tz: string, custom: { from: Date; to: Date }) {
  const now = new Date(nowIso);
  switch (period) {
    case 'this-week': {
      const w = weekRange(nowIso, weekStartsOn, tz);
      return { from: w.start, to: w.end };
    }
    case 'last-week': {
      const thisWeek = weekRange(nowIso, weekStartsOn, tz);
      const w = weekRange(new Date(Date.parse(thisWeek.start) - DAY_MS / 2).toISOString(), weekStartsOn, tz);
      return { from: w.start, to: w.end };
    }
    case 'this-month':
      return {
        from: dayRange(new Date(now.getFullYear(), now.getMonth(), 1, 12), tz).from,
        to: dayRange(new Date(now.getFullYear(), now.getMonth() + 1, 1, 12), tz).from,
      };
    default: {
      const [a, b] = custom.from <= custom.to ? [custom.from, custom.to] : [custom.to, custom.from];
      return { from: dayRange(a, tz).from, to: dayRange(b, tz).to };
    }
  }
}

export function ReportsScreen() {
  const settings = useSettings();
  const plan = usePlan();
  const { business } = settings;
  const { colors, scheme } = useTheme();
  const tz = deviceTimeZone();
  const nowSec = useNowSeconds(false);
  const nowIso = new Date(nowSec * 1000).toISOString();
  const [period, setPeriod] = useState<Period>('this-week');
  const [custom, setCustom] = useState(() => ({ from: new Date(nowSec * 1000 - 13 * DAY_MS), to: new Date(nowSec * 1000) }));
  const [clientFilter, setClientFilter] = useState<string>(ALL);
  const [branded, setBranded] = useState(true);
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);

  const clients = useClients({ includeArchived: true });
  const range = periodRange(period, nowIso, settings.weekStartsOn, tz, custom);
  const floor = historyFloor(plan, nowIso);
  const clipped = !!floor && range.from < floor;
  const from = clipped && floor ? floor : range.from;
  const to = range.to < from ? from : range.to;
  const all = useEntries({ from, to });
  const entries = clientFilter === ALL ? all : all.filter((e) => e.clientId === clientFilter);

  const reportClients: ReportClient[] = clients;
  const options = { from, to, tz, rounding: settings.rounding, mode: settings.roundingMode, now: nowIso };
  const summary = summarize(entries, reportClients, options);
  const max = Math.max(1, ...summary.clients.map((c) => c.roundedSeconds));
  const filterClient = clients.find((c) => c.id === clientFilter) ?? null;
  const canBrand = gate(plan, 'brandedPdf');
  const useBrand = canBrand && branded;
  const periodLabel = `${formatDate(new Date(Date.parse(from)))} – ${formatDate(new Date(Date.parse(to) - 1))}`;
  const filename = `${filterClient?.name ?? 'Timesheet'} ${formatDayShort(new Date(Date.parse(from)))}`;

  const jobsOf = (list: readonly EntryWithClient[]) => {
    const jobs = new Map<string, string>();
    for (const e of list) if (e.jobId && e.jobName) jobs.set(e.jobId, e.jobName);
    return [...jobs].map(([id, name]) => ({ id, name }));
  };

  const run = async (kind: 'pdf' | 'csv') => {
    if (!entries.length) {
      haptics.warning();
      showToast({ message: 'Nothing to export in this period' });
      return;
    }
    setExporting(kind);
    try {
      const jobs = jobsOf(entries);
      if (kind === 'csv') {
        const text = toCsv(toCsvRows(entries, reportClients, settings, { tz, jobs, from, to, now: nowIso }));
        const res = await exportCsv(text, filename);
        if (res.shared) haptics.success();
      } else {
        const model = timesheetModel(entries, reportClients, {
          ...options,
          locale: LOCALE,
          jobs,
          title: filterClient ? `${filterClient.name} timesheet` : 'Timesheet',
          brand: useBrand ? { businessName: business.name || undefined, accentHex: colors.accent } : null,
        });
        const editedNotes: Record<string, string> = {};
        for (const e of entries) if (e.editedNote) editedNotes[e.id] = e.editedNote;
        const html = timesheetHtml(model, {
          branded: useBrand,
          business,
          bandHex: filterClient ? clientColorHex(filterClient.color) : colors.accent,
          editedNotes,
        });
        const res = await exportPdf(html, filename);
        if (res.shared) haptics.success();
      }
    } catch (error) {
      haptics.warning();
      showToast({ message: error instanceof Error ? `Export failed: ${error.message}` : 'Export failed' });
    } finally {
      setExporting(null);
    }
  };

  const currencies = Object.entries(summary.total.earningsByCurrency);

  return (
    <Screen>
      <View style={{ gap: spacing.md }}>
        <SegmentedControl
          values={PERIODS.map((p) => p.label)}
          selectedIndex={PERIODS.findIndex((p) => p.id === period)}
          onChange={(index) => {
            haptics.tapLight();
            setPeriod(PERIODS[index]?.id ?? 'this-week');
          }}
        />
        {period === 'custom' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
            <DateField mode="date" accessibilityLabel="From" value={custom.from} maximumDate={new Date(nowSec * 1000)} onChange={(d) => setCustom((c) => ({ ...c, from: d }))} />
            <AppText variant="callout" tone="secondary">
              to
            </AppText>
            <DateField mode="date" accessibilityLabel="To" value={custom.to} maximumDate={new Date(nowSec * 1000)} onChange={(d) => setCustom((c) => ({ ...c, to: d }))} />
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <AppText variant="callout" tone="secondary" tabular style={{ flexShrink: 1 }}>
            {periodLabel}
          </AppText>
          <Select
            accessibilityLabel="Client"
            value={clientFilter}
            options={[{ label: 'All clients', value: ALL }, ...clients.map((c) => ({ label: c.name, value: c.id }))]}
            onChange={setClientFilter}
          />
        </View>
      </View>

      {clipped ? (
        <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.accentSoft }}>
          <AppText variant="callout" weight="600">
            Showing the last 30 days
          </AppText>
          <AppText variant="caption" tone="secondary">
            Free reports cover 30 days of history. Older hours are kept on this phone; Pro includes them in reports and exports.
          </AppText>
          <PrimaryButton title="Upgrade to Pro" size="sm" block={false} onPress={() => openPaywall('history')} />
        </View>
      ) : null}

      <View
        accessible
        accessibilityLabel={`Total ${formatDuration(summary.total.roundedSeconds, { style: 'long' })}, ${summary.daysWorked} days worked, ${summary.total.entryCount} entries`}
        style={{ gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.surfaceElevated }}
      >
        <AppText variant="caption" tone="secondary" style={overline}>
          Total
        </AppText>
        <Duration seconds={summary.total.roundedSeconds} variant="display" adjustsFontSizeToFit numberOfLines={1} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
          {currencies.length ? (
            currencies.map(([cur, cents]) => <Money key={cur} cents={cents} currency={cur} variant="headline" weight="600" />)
          ) : (
            <Money cents={0} currency={settings.currency} variant="headline" weight="600" />
          )}
          <AppText variant="headline" tone="secondary" tabular>
            {`${summary.daysWorked} ${summary.daysWorked === 1 ? 'day' : 'days'}`}
          </AppText>
          <AppText variant="headline" tone="secondary" tabular>
            {`${summary.total.entryCount} ${summary.total.entryCount === 1 ? 'entry' : 'entries'}`}
          </AppText>
        </View>
        {settings.rounding !== 'none' ? (
          <AppText variant="caption" tone="secondary">
            {`Rounded to ${settings.rounding} min (${settings.roundingMode}) per entry`}
          </AppText>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="By client" />
        {summary.clients.length ? (
          <ListGroup>
            {summary.clients.map((c) => (
              <View
                key={c.clientId}
                accessible
                accessibilityLabel={`${c.name}, ${formatDuration(c.roundedSeconds, { style: 'long' })}`}
                style={{ padding: spacing.md, gap: spacing.sm }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <ClientBar color={c.color} style={{ height: spacing.md, alignSelf: 'center' }} />
                  <AppText variant="body" weight="600" numberOfLines={1} style={{ flex: 1 }}>
                    {c.name}
                  </AppText>
                  <Duration seconds={c.roundedSeconds} variant="callout" weight="600" />
                  <Money cents={c.earningsCents} currency={c.currency} variant="callout" tone="secondary" selectable={false} />
                </View>
                <View style={{ height: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surfaceSunken, overflow: 'hidden' }}>
                  <View
                    style={{
                      width: `${Math.max(2, (c.roundedSeconds / max) * 100)}%`,
                      height: '100%',
                      borderRadius: radius.pill,
                      backgroundColor: c.color ? clientColorHex(c.color) : colors.border,
                    }}
                  />
                </View>
              </View>
            ))}
          </ListGroup>
        ) : (
          <EmptyState icon={{ sf: 'chart.bar', md: 'bar_chart' }} title="No time in this period" body="Pick another period, or start the clock to fill this in." />
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionHeader title="Export" />
        <View style={{ gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: colors.surfaceElevated }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <AppText variant="body" weight="600">
                  Branded PDF
                </AppText>
                {canBrand ? null : <ProBadge reason="branded-pdf" />}
              </View>
              <AppText variant="caption" tone="secondary">
                {canBrand
                  ? business.name
                    ? `Colour header with ${business.name} and your contact details.`
                    : 'Colour header. Add your business name in Settings > Business details.'
                  : 'Colour header with your business name and contact details.'}
              </AppText>
            </View>
            <Host matchContents seedColor={colors.accent} colorScheme={scheme}>
              <Switch value={useBrand} onValueChange={(v) => (canBrand ? setBranded(v) : openPaywall('branded-pdf'))} />
            </Host>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <PrimaryButton
              title="Export PDF"
              size="lg"
              icon={{ sf: 'doc.richtext', md: 'picture_as_pdf' }}
              style={{ flex: 1 }}
              loading={exporting === 'pdf'}
              disabled={exporting !== null}
              onPress={() => void run('pdf')}
            />
            <PrimaryButton
              title="CSV"
              size="lg"
              variant="secondary"
              icon={{ sf: 'tablecells', md: 'table_view' }}
              style={{ flex: 1 }}
              loading={exporting === 'csv'}
              disabled={exporting !== null}
              onPress={() => void run('csv')}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}
