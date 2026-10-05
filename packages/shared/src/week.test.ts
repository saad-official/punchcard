import { bucketEntriesByDay, bucketEntriesByWeek, dayKey, startOfWeek, weekRange } from "./week";

const e = (id: string, startedAt: string) => ({ id, startedAt });

describe("dayKey", () => {
  it("returns the UTC date by default", () => {
    expect(dayKey("2026-10-05T23:59:59Z")).toBe("2026-10-05");
  });
  it("returns the local date in the zone", () => {
    expect(dayKey("2026-10-06T02:00:00Z", "America/Toronto")).toBe("2026-10-05");
    expect(dayKey("2026-10-05T20:00:00Z", "Asia/Tokyo")).toBe("2026-10-06");
  });
});

describe("startOfWeek", () => {
  it("finds Monday midnight for a Monday week start", () => {
    // 2026-10-08 is a Thursday
    expect(startOfWeek("2026-10-08T15:00:00Z", 1)).toBe("2026-10-05T00:00:00.000Z");
  });
  it("finds Sunday midnight for a Sunday week start", () => {
    expect(startOfWeek("2026-10-08T15:00:00Z", 0)).toBe("2026-10-04T00:00:00.000Z");
  });
  it("returns the same day when the date is the week start", () => {
    expect(startOfWeek("2026-10-05T00:00:00Z", 1)).toBe("2026-10-05T00:00:00.000Z");
  });
  it("supports a Saturday week start", () => {
    expect(startOfWeek("2026-10-08T15:00:00Z", 6)).toBe("2026-10-03T00:00:00.000Z");
  });
  it("uses local midnight in the zone", () => {
    expect(startOfWeek("2026-10-06T02:00:00Z", 1, "America/Toronto")).toBe("2026-10-05T04:00:00.000Z");
  });
});

describe("weekRange", () => {
  it("returns a half-open 7-day range and its day keys", () => {
    expect(weekRange("2026-10-08T15:00:00Z", 1)).toEqual({
      start: "2026-10-05T00:00:00.000Z",
      end: "2026-10-12T00:00:00.000Z",
      days: ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"],
    });
  });
  it("is 167 hours long across Toronto's spring-forward week", () => {
    const r = weekRange("2026-03-08T12:00:00Z", 1, "America/Toronto");
    expect(r.start).toBe("2026-03-02T05:00:00.000Z");
    expect(r.end).toBe("2026-03-09T04:00:00.000Z");
    expect((Date.parse(r.end) - Date.parse(r.start)) / 3_600_000).toBe(167);
  });
});

describe("bucketEntriesByDay", () => {
  it("groups entries by local start day, days and entries in order", () => {
    const list = [
      e("late", "2026-10-06T03:00:00Z"),
      e("b", "2026-10-05T15:00:00Z"),
      e("a", "2026-10-05T13:00:00Z"),
      e("next", "2026-10-06T13:00:00Z"),
    ];
    const buckets = bucketEntriesByDay(list, "America/Toronto");
    expect(buckets.map((b) => [b.day, b.entries.map((x) => x.id)])).toEqual([
      ["2026-10-05", ["a", "b", "late"]],
      ["2026-10-06", ["next"]],
    ]);
  });
  it("returns no buckets for no entries", () => {
    expect(bucketEntriesByDay([])).toEqual([]);
  });
});

describe("bucketEntriesByWeek", () => {
  it("groups entries by week start", () => {
    const list = [e("a", "2026-10-04T12:00:00Z"), e("b", "2026-10-05T12:00:00Z"), e("c", "2026-10-11T23:00:00Z")];
    const buckets = bucketEntriesByWeek(list, 1);
    expect(buckets.map((b) => [b.weekStart, b.startDay, b.entries.map((x) => x.id)])).toEqual([
      ["2026-09-28T00:00:00.000Z", "2026-09-28", ["a"]],
      ["2026-10-05T00:00:00.000Z", "2026-10-05", ["b", "c"]],
    ]);
  });
  it("respects the zone when an entry is near midnight", () => {
    // Monday 01:00 UTC is still Sunday evening in Toronto
    const buckets = bucketEntriesByWeek([e("a", "2026-10-05T01:00:00Z")], 1, "America/Toronto");
    expect(buckets[0]?.startDay).toBe("2026-09-28");
  });
});
