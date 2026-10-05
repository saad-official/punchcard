// Shared fixtures for the report tests (not a test file; excluded from the package exports).
export const TZ = "America/Toronto";
export const FROM = "2026-10-05T04:00:00.000Z"; // Mon Oct 5 local midnight
export const TO = "2026-10-12T04:00:00.000Z"; // following Monday

export const C1 = "0199b3a0-0000-7000-8000-0000000000c1";
export const C2 = "0199b3a0-0000-7000-8000-0000000000c2";
export const J1 = "0199b3a0-0000-7000-8000-0000000000a1";

export const clients = [
  { id: C1, name: "Smith kitchen", color: "orange" as const, hourlyRateCents: 6500, currency: "CAD" },
  { id: C2, name: "Lee deck", color: "blue" as const, hourlyRateCents: 4500, currency: "CAD" },
];

export const jobs = [{ id: J1, name: "Backsplash" }];

const base = { breakSeconds: 0, note: "", deletedAt: null as string | null, jobId: null as string | null };

export const entries = [
  // Tue, 2h20m → 2h15m rounded to 15 min
  { ...base, id: "e3", clientId: C2, startedAt: "2026-10-06T13:00:00.000Z", endedAt: "2026-10-06T15:20:00.000Z", note: 'Said "thanks"' },
  // Mon 08:00–12:07, 4h07m → 4h00m
  { ...base, id: "e1", clientId: C1, jobId: J1, startedAt: "2026-10-05T12:00:00.000Z", endedAt: "2026-10-05T16:07:00.000Z", note: "Tiles, grout" },
  // Mon 13:00–17:00 with 30 min break → 3h30m
  { ...base, id: "e2", clientId: C1, startedAt: "2026-10-05T17:00:00.000Z", endedAt: "2026-10-05T21:00:00.000Z", breakSeconds: 1800 },
  // soft-deleted: ignored
  { ...base, id: "e4", clientId: C2, startedAt: "2026-10-07T13:00:00.000Z", endedAt: "2026-10-07T20:00:00.000Z", deletedAt: "2026-10-07T21:00:00.000Z" },
  // next week: outside the range
  { ...base, id: "e5", clientId: C1, startedAt: "2026-10-12T13:00:00.000Z", endedAt: "2026-10-12T14:00:00.000Z" },
  // running Thursday since 09:00 local
  { ...base, id: "e6", clientId: C2, startedAt: "2026-10-08T13:00:00.000Z", endedAt: null as string | null },
];
