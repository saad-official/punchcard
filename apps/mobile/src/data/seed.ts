// Dev-only demo data. Not run automatically: call `seedDemoData()` from a dev menu.
import { createClient, createJob, listClients } from './clients-repo';
import { addManualEntry, clockIn } from './entries-repo';
import type { Client } from './types';

const HOUR = 3_600_000;

/** Inserts 3 clients and ~2 weeks of entries (+ a running one). No-op when clients exist unless `force`. */
export function seedDemoData(opts: { force?: boolean; withRunning?: boolean } = {}): { clients: Client[] } {
  if (!opts.force && listClients({ includeArchived: true }).length > 0) return { clients: [] };
  const smith = createClient({ name: 'Smith kitchen', color: 'orange', hourlyRateCents: 6500, currency: 'USD', address: '12 Elm St' });
  const patel = createClient({ name: 'Patel bathroom', color: 'teal', hourlyRateCents: 7200, currency: 'USD' });
  const greene = createClient({ name: 'Greene Co. office', color: 'violet', hourlyRateCents: 5500, currency: 'USD' });
  const tiling = createJob(patel.id, 'Tiling');
  createJob(patel.id, 'Plumbing rough-in');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let d = 13; d >= 1; d--) {
    const day = new Date(today.getTime() - d * 24 * HOUR);
    if (day.getDay() === 0) continue; // Sundays off
    const at = (h: number) => new Date(day.getTime() + h * HOUR);
    addManualEntry({ clientId: smith.id, startedAt: at(7.5), endedAt: at(11.75), breakSeconds: 900, note: 'Cabinets' });
    addManualEntry({ clientId: patel.id, jobId: tiling.id, startedAt: at(12.5), endedAt: at(16), mileageKm: 14 });
    if (d % 3 === 0) addManualEntry({ clientId: greene.id, startedAt: at(16.5), endedAt: at(18) });
  }
  addManualEntry({ clientId: greene.id, startedAt: new Date(today.getTime() + 7 * HOUR), endedAt: new Date(today.getTime() + 8.5 * HOUR) });
  if (opts.withRunning ?? true) clockIn({ clientId: smith.id, at: new Date(Date.now() - 1.2 * HOUR) });
  return { clients: [smith, patel, greene] };
}
