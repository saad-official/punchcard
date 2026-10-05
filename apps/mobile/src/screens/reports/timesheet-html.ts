// Renders the shared `timesheetModel` as print HTML for expo-print. Basic (Free) is a clean
// paper timesheet; branded (Pro) adds a colour band, the business name and contact details.
import { clientColorHex, type TimesheetModel } from '@punchcard/shared';
import { colors } from '@punchcard/shared/tokens';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export type TimesheetHtmlOptions = {
  branded: boolean;
  business?: { name?: string; phone?: string; email?: string };
  /** Header band colour (client colour for a single-client sheet, else the accent). */
  bandHex?: string;
  /** Audit notes by entry id ("edited: forgot to stop"). */
  editedNotes?: Record<string, string>;
};

const paper = colors.light;

export function timesheetHtml(model: TimesheetModel, opts: TimesheetHtmlOptions): string {
  const band = opts.bandHex ?? paper.accent;
  const business = opts.branded ? opts.business : undefined;
  const contact = [business?.phone, business?.email].filter(Boolean).map((s) => esc(String(s))).join(' · ');

  const days = model.days
    .map(
      (d) => `
      <section class="day">
        <div class="day-head"><span>${esc(d.label)}</span><span class="num">${esc(d.totalLabel)}</span></div>
        <table>
          <tbody>
          ${d.rows
            .map((r) => {
              const edited = opts.editedNotes?.[r.entryId];
              return `
            <tr>
              <td class="bar"><i style="background:${r.clientColor ? clientColorHex(r.clientColor) : paper.border}"></i></td>
              <td class="what">
                <strong>${esc(r.clientName)}</strong>${r.jobName ? ` <span class="muted">· ${esc(r.jobName)}</span>` : ''}
                ${r.note ? `<div class="note">${esc(r.note)}</div>` : ''}
                ${edited ? `<div class="edited">Edited: ${esc(edited)}</div>` : ''}
              </td>
              <td class="num time">${esc(r.start)}–${esc(r.end)}</td>
              <td class="num muted">${r.breakLabel ? `break ${esc(r.breakLabel)}` : ''}</td>
              <td class="num">${esc(r.hours)} h</td>
              <td class="num strong">${esc(r.amountLabel)}</td>
            </tr>`;
            })
            .join('')}
          </tbody>
        </table>
      </section>`,
    )
    .join('');

  const perClient = model.totals.perClient
    .map(
      (c) => `<tr><td class="bar"><i style="background:${c.color ? clientColorHex(c.color) : paper.border}"></i></td><td>${esc(c.name)}</td><td class="num">${esc(c.hours)} h</td><td class="num strong">${esc(c.amountLabel)}</td></tr>`,
    )
    .join('');

  const amounts = model.totals.amounts.map((a) => esc(a.label)).join(' + ') || '—';

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  @page { margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Roboto, Arial, sans-serif; color: ${paper.text}; font-size: 11pt; margin: 0; }
  .num { font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
  .muted { color: ${paper.textSecondary}; }
  .strong { font-weight: 600; }
  header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 12pt; border-bottom: 2pt solid ${paper.text}; margin-bottom: 14pt; }
  header.branded { border-bottom: none; padding: 14pt 16pt; margin: 0 0 16pt; background: ${band}; color: ${paper.onAccent}; border-radius: 8pt; }
  h1 { margin: 0; font-size: 20pt; letter-spacing: -0.3pt; }
  .period { font-size: 10.5pt; margin-top: 2pt; }
  .biz { text-align: right; font-size: 10pt; }
  .biz strong { font-size: 12pt; display: block; }
  .day { margin-bottom: 12pt; page-break-inside: avoid; }
  .day-head { display: flex; justify-content: space-between; font-weight: 700; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.6pt; color: ${paper.textSecondary}; border-bottom: 0.75pt solid ${paper.separator}; padding-bottom: 3pt; margin-bottom: 2pt; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 5pt 4pt; vertical-align: top; border-bottom: 0.5pt solid ${paper.separator}; }
  td.bar { width: 6pt; padding-left: 0; }
  td.bar i { display: block; width: 3pt; height: 14pt; border-radius: 2pt; }
  td.time { width: 90pt; }
  .note { color: ${paper.textSecondary}; font-size: 9.5pt; margin-top: 2pt; }
  .edited { color: ${paper.warning}; font-size: 9pt; margin-top: 2pt; }
  .totals { margin-top: 18pt; border-top: 2pt solid ${paper.text}; padding-top: 8pt; page-break-inside: avoid; }
  .grand { display: flex; justify-content: space-between; font-size: 14pt; font-weight: 700; margin-top: 8pt; }
  footer { margin-top: 24pt; font-size: 8.5pt; color: ${paper.textTertiary}; }
</style></head>
<body>
  <header class="${opts.branded ? 'branded' : ''}">
    <div>
      <h1>${esc(model.header.title)}</h1>
      <div class="period">${esc(model.header.periodLabel)}</div>
    </div>
    ${business?.name || contact ? `<div class="biz">${business?.name ? `<strong>${esc(business.name)}</strong>` : ''}${contact}</div>` : ''}
  </header>
  ${days || `<p class="muted">No time recorded in this period.</p>`}
  <section class="totals">
    <table><tbody>${perClient}</tbody></table>
    <div class="grand"><span>Total ${esc(model.totals.hours)} h</span><span class="num">${amounts}</span></div>
  </section>
  <footer>Generated by Punchcard · times in local time · hours rounded per your settings</footer>
</body></html>`;
}
