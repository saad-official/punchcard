import { timesheetModel } from "./timesheet";
import { C1, clients, entries, FROM, jobs, TO, TZ } from "./report-fixtures.test-util";

const opts = { from: FROM, to: TO, tz: TZ, rounding: "15" as const, mode: "nearest" as const, locale: "en-CA", jobs };

describe("timesheetModel", () => {
  it("builds a header with title and period label", () => {
    expect(timesheetModel(entries, clients, opts).header).toEqual({
      title: "Timesheet",
      periodLabel: "Oct 5, 2026 – Oct 11, 2026",
      from: FROM,
      to: TO,
      clientNames: ["Smith kitchen", "Lee deck"],
      brand: null,
    });
  });
  it("accepts a custom title and brand", () => {
    const m = timesheetModel(entries, clients, { ...opts, title: "Smith kitchen — week 41", brand: { businessName: "Khan Plumbing" } });
    expect(m.header.title).toBe("Smith kitchen — week 41");
    expect(m.header.brand).toEqual({ businessName: "Khan Plumbing" });
  });
  it("groups rows by local day with labels and day totals", () => {
    const days = timesheetModel(entries, clients, opts).days;
    expect(days.map((d) => [d.day, d.label, d.rows.length, d.totalSeconds, d.totalLabel])).toEqual([
      ["2026-10-05", "Mon, Oct 5", 2, 27000, "7h 30m"],
      ["2026-10-06", "Tue, Oct 6", 1, 8100, "2h 15m"],
    ]);
  });
  it("shapes each row for rendering", () => {
    const row = timesheetModel(entries, clients, opts).days[0]!.rows[1]!;
    expect(row).toEqual({
      entryId: "e2",
      clientId: C1,
      clientName: "Smith kitchen",
      clientColor: "orange",
      jobName: "",
      start: "13:00",
      end: "17:00",
      breakLabel: "30m",
      durationLabel: "3h 30m",
      hours: "3.50",
      amountCents: 22750,
      amountLabel: "$227.50",
      note: "",
    });
  });
  it("totals hours and money, per client and overall", () => {
    const t = timesheetModel(entries, clients, opts).totals;
    expect(t).toMatchObject({ seconds: 35820, roundedSeconds: 35100, hours: "9.75", durationLabel: "9h 45m" });
    expect(t.amounts).toEqual([{ currency: "CAD", cents: 58875, label: "$588.75" }]);
    expect(t.perClient.map((c) => [c.name, c.hours, c.amountLabel])).toEqual([
      ["Smith kitchen", "7.50", "$487.50"],
      ["Lee deck", "2.25", "$101.25"],
    ]);
  });
  it("shows a running entry with an em dash end when now is given", () => {
    const m = timesheetModel(entries, clients, { ...opts, now: "2026-10-08T14:00:00.000Z" });
    expect(m.days.at(-1)?.rows[0]).toMatchObject({ entryId: "e6", end: "—", hours: "1.00" });
  });
  it("has no days for an empty period", () => {
    const m = timesheetModel([], clients, opts);
    expect(m.days).toEqual([]);
    expect(m.totals.amounts).toEqual([]);
    expect(m.header.clientNames).toEqual([]);
  });
});
