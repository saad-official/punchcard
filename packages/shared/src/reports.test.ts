import { CSV_HEADER, priceEntries, summarize, toCsvRows } from "./reports";
import { C1, C2, clients, entries, FROM, jobs, TO, TZ } from "./report-fixtures.test-util";

const opts = { from: FROM, to: TO, tz: TZ, rounding: "15" as const, mode: "nearest" as const };

describe("summarize", () => {
  it("totals each client with rounded seconds and earnings, busiest first", () => {
    const s = summarize(entries, clients, opts);
    expect(s.clients).toEqual([
      { clientId: C1, name: "Smith kitchen", color: "orange", currency: "CAD", hourlyRateCents: 6500, entryCount: 2, seconds: 27420, roundedSeconds: 27000, earningsCents: 48750 },
      { clientId: C2, name: "Lee deck", color: "blue", currency: "CAD", hourlyRateCents: 4500, entryCount: 1, seconds: 8400, roundedSeconds: 8100, earningsCents: 10125 },
    ]);
  });
  it("computes the grand total and per-currency earnings", () => {
    expect(summarize(entries, clients, opts).total).toEqual({
      entryCount: 3, seconds: 35820, roundedSeconds: 35100, earningsCents: 58875, earningsByCurrency: { CAD: 58875 },
    });
  });
  it("counts days worked and the longest day in the zone", () => {
    const s = summarize(entries, clients, opts);
    expect(s.daysWorked).toBe(2);
    expect(s.longestDay).toEqual({ day: "2026-10-05", seconds: 27420 });
  });
  it("ignores soft-deleted entries and entries outside [from, to)", () => {
    const ids = summarize(entries, clients, opts).clients.reduce((n, c) => n + c.entryCount, 0);
    expect(ids).toBe(3);
  });
  it("includes the running entry only when now is given", () => {
    const s = summarize(entries, clients, { ...opts, now: "2026-10-08T14:00:00.000Z" });
    expect(s.clients.find((c) => c.clientId === C2)).toMatchObject({ entryCount: 2, seconds: 12000 });
    expect(s.daysWorked).toBe(3);
  });
  it("pays exact seconds when rounding is none", () => {
    const s = summarize(entries, clients, { from: FROM, to: TO, tz: TZ });
    expect(s.clients[0]).toMatchObject({ seconds: 27420, roundedSeconds: 27420, earningsCents: 26758 + 22750 });
  });
  it("groups entries for an unknown client under a zero-rate placeholder", () => {
    const orphan = { ...entries[1]!, id: "x", clientId: "gone" };
    const s = summarize([orphan], clients, opts);
    expect(s.clients[0]).toMatchObject({ clientId: "gone", name: "Unknown client", color: null, hourlyRateCents: 0, earningsCents: 0 });
  });
  it("returns zeros and no longest day for an empty range", () => {
    const s = summarize([], clients, opts);
    expect(s.clients).toEqual([]);
    expect(s.total.seconds).toBe(0);
    expect(s.daysWorked).toBe(0);
    expect(s.longestDay).toBeNull();
  });
  it("keeps mixed currencies apart", () => {
    const usd = [...clients, { id: "u", name: "US client", color: "teal" as const, hourlyRateCents: 3600, currency: "USD" }];
    const extra = { ...entries[1]!, id: "u1", clientId: "u" };
    expect(summarize([...entries, extra], usd, opts).total.earningsByCurrency).toEqual({ CAD: 58875, USD: 14400 });
  });
});

describe("toCsvRows", () => {
  const settings = { rounding: "15" as const, roundingMode: "nearest" as const };

  it("starts with the header row", () => {
    expect(toCsvRows(entries, clients, settings, { tz: TZ, jobs })[0]).toEqual(CSV_HEADER);
    expect(CSV_HEADER).toEqual(["Date", "Client", "Job", "Start", "End", "Break (min)", "Hours", "Rate", "Amount", "Currency", "Note"]);
  });
  it("produces invoice-ready rows in start order, skipping deleted and running entries", () => {
    const rows = toCsvRows(entries, clients, settings, { tz: TZ, jobs, from: FROM, to: TO }).slice(1);
    expect(rows).toEqual([
      ["2026-10-05", "Smith kitchen", "Backsplash", "08:00", "12:07", "0", "4.00", "65.00", "260.00", "CAD", "Tiles, grout"],
      ["2026-10-05", "Smith kitchen", "", "13:00", "17:00", "30", "3.50", "65.00", "227.50", "CAD", ""],
      ["2026-10-06", "Lee deck", "", "09:00", "11:20", "0", "2.25", "45.00", "101.25", "CAD", 'Said "thanks"'],
    ]);
  });
  it("includes entries outside a range when no range is given", () => {
    expect(toCsvRows(entries, clients, settings, { tz: TZ })).toHaveLength(1 + 4);
  });
  it("includes a running entry with an empty end when now is given", () => {
    const rows = toCsvRows(entries, clients, settings, { tz: TZ, from: FROM, to: TO, now: "2026-10-08T14:00:00.000Z" });
    expect(rows.at(-1)).toEqual(["2026-10-08", "Lee deck", "", "09:00", "", "0", "1.00", "45.00", "45.00", "CAD", ""]);
  });
  it("defaults to UTC times and no rounding", () => {
    const rows = toCsvRows([entries[1]!], clients, {});
    expect(rows[1]?.slice(3, 7)).toEqual(["12:00", "16:07", "0", "4.12"]);
  });
});

describe("priceEntries", () => {
  it("returns live finished entries in start order with rounded time and earnings", () => {
    const priced = priceEntries(entries, clients, { from: FROM, to: TO, rounding: "15" });
    expect(priced.map((p) => [p.entry.id, p.seconds, p.roundedSeconds, p.earningsCents])).toEqual([
      ["e1", 14820, 14400, 26000],
      ["e2", 12600, 12600, 22750],
      ["e3", 8400, 8100, 10125],
    ]);
  });
  it("attaches the client, or null when it is missing", () => {
    const orphan = { ...entries[1]!, clientId: "gone" };
    expect(priceEntries([orphan], clients, {})[0]).toMatchObject({ client: null, earningsCents: 0 });
    expect(priceEntries([entries[1]!], clients, {})[0]?.client?.id).toBe(C1);
  });
});
