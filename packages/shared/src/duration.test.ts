import { elapsedSeconds, formatDuration, hoursDecimal, roundSeconds, splitAtMidnight } from "./duration";

const done = (startedAt: string, endedAt: string, breakSeconds = 0) => ({ startedAt, endedAt, breakSeconds });

describe("elapsedSeconds", () => {
  it("measures a finished entry", () => {
    expect(elapsedSeconds(done("2026-10-05T09:00:00Z", "2026-10-05T10:05:09Z"))).toBe(3909);
  });
  it("subtracts accumulated break seconds", () => {
    expect(elapsedSeconds(done("2026-10-05T09:00:00Z", "2026-10-05T11:00:00Z", 900))).toBe(6300);
  });
  it("measures a running entry against now", () => {
    expect(elapsedSeconds({ startedAt: "2026-10-05T09:00:00Z", breakSeconds: 60 }, "2026-10-05T09:30:00Z")).toBe(1740);
  });
  it("excludes a break in progress on a running entry", () => {
    const e = { startedAt: "2026-10-05T09:00:00Z", breakSeconds: 0, breakStartedAt: "2026-10-05T09:20:00Z" };
    expect(elapsedSeconds(e, "2026-10-05T09:30:00Z")).toBe(1200);
  });
  it("ignores now for a finished entry", () => {
    expect(elapsedSeconds(done("2026-10-05T09:00:00Z", "2026-10-05T09:01:00Z"), "2030-01-01T00:00:00Z")).toBe(60);
  });
  it("floors partial seconds", () => {
    expect(elapsedSeconds(done("2026-10-05T09:00:00.000Z", "2026-10-05T09:00:01.999Z"))).toBe(1);
  });
  it("never returns a negative value", () => {
    expect(elapsedSeconds(done("2026-10-05T09:00:00Z", "2026-10-05T09:01:00Z", 600))).toBe(0);
    expect(elapsedSeconds({ startedAt: "2026-10-05T09:00:00Z", breakSeconds: 0 }, "2026-10-05T08:00:00Z")).toBe(0);
  });
  it("compares instants across offsets", () => {
    expect(elapsedSeconds(done("2026-10-05T09:00:00-04:00", "2026-10-05T14:00:00Z"))).toBe(3600);
  });
  it("throws for a running entry without now", () => {
    expect(() => elapsedSeconds({ startedAt: "2026-10-05T09:00:00Z", breakSeconds: 0 })).toThrow(RangeError);
  });
});

describe("roundSeconds", () => {
  it("leaves seconds alone with rounding none", () => {
    expect(roundSeconds(3909, "none", "up")).toBe(3909);
  });
  it("rounds to the nearest 15 minutes by default", () => {
    expect(roundSeconds(7 * 60 + 29, "15")).toBe(0);
    expect(roundSeconds(7 * 60 + 30, "15")).toBe(900);
    expect(roundSeconds(23 * 60, "15", "nearest")).toBe(1800);
  });
  it("rounds up to the next 6 minutes (tenth of an hour)", () => {
    expect(roundSeconds(1, "6", "up")).toBe(360);
    expect(roundSeconds(360, "6", "up")).toBe(360);
    expect(roundSeconds(361, "6", "up")).toBe(720);
  });
  it("rounds down to whole minutes", () => {
    expect(roundSeconds(119, "1", "down")).toBe(60);
  });
  it("keeps zero at zero in every mode", () => {
    for (const mode of ["nearest", "up", "down"] as const) expect(roundSeconds(0, "15", mode)).toBe(0);
  });
});

describe("formatDuration", () => {
  it("formats clock style h:mm:ss by default", () => {
    expect(formatDuration(3909)).toBe("1:05:09");
    expect(formatDuration(9)).toBe("0:00:09");
    expect(formatDuration(36 * 3600)).toBe("36:00:00");
  });
  it("formats compact style", () => {
    expect(formatDuration(3909, { style: "compact" })).toBe("1h 05m");
    expect(formatDuration(45 * 60, { style: "compact" })).toBe("45m");
    expect(formatDuration(0, { style: "compact" })).toBe("0m");
  });
  it("formats long style with plurals", () => {
    expect(formatDuration(3909, { style: "long" })).toBe("1 hour 5 minutes");
    expect(formatDuration(2 * 3600 + 60, { style: "long" })).toBe("2 hours 1 minute");
    expect(formatDuration(3 * 3600, { style: "long" })).toBe("3 hours");
    expect(formatDuration(30, { style: "long" })).toBe("0 minutes");
  });
  it("treats negative and fractional input as whole non-negative seconds", () => {
    expect(formatDuration(-5)).toBe("0:00:00");
    expect(formatDuration(59.9)).toBe("0:00:59");
  });
});

describe("hoursDecimal", () => {
  it("formats hours with 2dp, half-up, without float drift", () => {
    expect(hoursDecimal(5400)).toBe("1.50");
    expect(hoursDecimal(0)).toBe("0.00");
    expect(hoursDecimal(18)).toBe("0.01");
    expect(hoursDecimal(17)).toBe("0.00");
    expect(hoursDecimal(37 * 3600 + 1206)).toBe("37.34");
  });
});

describe("splitAtMidnight", () => {
  it("returns a single segment for an entry within one day", () => {
    expect(splitAtMidnight(done("2026-10-05T09:00:00Z", "2026-10-05T17:00:00Z"))).toEqual([
      { day: "2026-10-05", start: "2026-10-05T09:00:00.000Z", end: "2026-10-05T17:00:00.000Z", seconds: 28800, netSeconds: 28800 },
    ]);
  });
  it("splits an overnight entry at local midnight", () => {
    const segs = splitAtMidnight(done("2026-10-05T22:00:00-04:00", "2026-10-06T02:00:00-04:00"), "America/Toronto");
    expect(segs.map((s) => [s.day, s.seconds])).toEqual([
      ["2026-10-05", 7200],
      ["2026-10-06", 7200],
    ]);
    expect(segs[1]?.start).toBe("2026-10-06T04:00:00.000Z");
  });
  it("splits a multi-day entry into one segment per day", () => {
    const segs = splitAtMidnight(done("2026-10-05T12:00:00Z", "2026-10-07T06:00:00Z"));
    expect(segs.map((s) => s.seconds)).toEqual([43200, 86400, 21600]);
  });
  it("handles the 23-hour spring-forward day in Toronto", () => {
    const segs = splitAtMidnight(done("2026-03-07T20:00:00-05:00", "2026-03-08T20:00:00-04:00"), "America/Toronto");
    expect(segs.map((s) => [s.day, s.seconds])).toEqual([
      ["2026-03-07", 4 * 3600],
      ["2026-03-08", 19 * 3600],
    ]);
  });
  it("handles the 25-hour fall-back day in Toronto", () => {
    const segs = splitAtMidnight(done("2026-10-31T22:00:00-04:00", "2026-11-01T22:00:00-05:00"), "America/Toronto");
    expect(segs.map((s) => [s.day, s.seconds])).toEqual([
      ["2026-10-31", 2 * 3600],
      ["2026-11-01", 23 * 3600],
    ]);
  });
  it("spreads break time proportionally so net seconds sum to elapsed", () => {
    const e = done("2026-10-05T20:00:00Z", "2026-10-06T04:00:00Z", 1801);
    const segs = splitAtMidnight(e);
    expect(segs.map((s) => s.netSeconds)).toEqual([13500, 13499]);
    expect(segs.reduce((a, s) => a + s.netSeconds, 0)).toBe(elapsedSeconds(e));
  });
  it("splits a running entry up to now", () => {
    const segs = splitAtMidnight({ startedAt: "2026-10-05T23:00:00Z", breakSeconds: 0 }, "UTC", "2026-10-06T01:00:00Z");
    expect(segs.map((s) => s.seconds)).toEqual([3600, 3600]);
  });
  it("returns no segments for a zero-length entry", () => {
    expect(splitAtMidnight(done("2026-10-05T09:00:00Z", "2026-10-05T09:00:00Z"))).toEqual([]);
  });
});
