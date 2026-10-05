// Domain types come from @punchcard/shared (zod-inferred). This file only adds the
// app-side input/view shapes the repositories and hooks use.
import type { Client, ClientColor, Entry } from '@punchcard/shared';

export type {
  Client,
  ClientColor,
  Entry,
  EntryPhoto,
  EntrySource,
  Job,
  Plan,
  Rounding,
  RoundingMode,
  Settings,
} from '@punchcard/shared';

/** Half-open ISO range `[from, to)`. Accepts Date for convenience. */
export type DateRange = { from: string | Date; to: string | Date };

export type NewClientInput = {
  name: string;
  color: ClientColor;
  hourlyRateCents?: number;
  currency?: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  geofenceRadiusM?: number | null;
};

export type ClientPatch = Partial<NewClientInput>;

export type ManualEntryInput = {
  clientId: string;
  jobId?: string | null;
  startedAt: string | Date;
  endedAt: string | Date;
  breakSeconds?: number;
  note?: string;
  mileageKm?: number | null;
};

export type EntryPatch = Partial<{
  clientId: string;
  jobId: string | null;
  startedAt: string | Date;
  endedAt: string | Date | null;
  breakSeconds: number;
  note: string;
  mileageKm: number | null;
}>;

/** An entry joined with the display fields of its client and job. */
export type EntryWithClient = Entry & {
  clientName: string;
  clientColor: Client['color'];
  hourlyRateCents: number;
  currency: string;
  jobName: string | null;
};

export type DayTotals = {
  /** Worked seconds on the local day (breaks excluded), including the running entry up to now. */
  totalSeconds: number;
  earningsCents: number;
  entryCount: number;
  byClient: {
    clientId: string;
    clientName: string;
    clientColor: Client['color'];
    currency: string;
    seconds: number;
    earningsCents: number;
  }[];
};
