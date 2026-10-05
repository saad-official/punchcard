import { findOverlaps, overlapSeconds } from "./intervals";

const e = (id: string, startedAt: string, endedAt?: string) => ({ id, startedAt, endedAt, breakSeconds: 0 });

describe("overlapSeconds", () => {
  it("is the shared wall-clock span of two entries", () => {
    const a = e("a", "2026-10-05T09:00:00Z", "2026-10-05T11:00:00Z");
    const b = e("b", "2026-10-05T10:30:00Z", "2026-10-05T12:00:00Z");
    expect(overlapSeconds(a, b)).toBe(1800);
  });
  it("is zero for touching or disjoint entries", () => {
    const a = e("a", "2026-10-05T09:00:00Z", "2026-10-05T10:00:00Z");
    expect(overlapSeconds(a, e("b", "2026-10-05T10:00:00Z", "2026-10-05T11:00:00Z"))).toBe(0);
    expect(overlapSeconds(a, e("c", "2026-10-05T12:00:00Z", "2026-10-05T13:00:00Z"))).toBe(0);
  });
  it("treats a running entry as ending at now", () => {
    const running = e("a", "2026-10-05T09:00:00Z");
    const earlier = e("b", "2026-10-05T08:00:00Z", "2026-10-05T09:10:00Z");
    expect(overlapSeconds(running, earlier, "2026-10-05T12:00:00Z")).toBe(600);
  });
});

describe("findOverlaps", () => {
  it("lists every overlapping pair of ids, earliest first", () => {
    const list = [
      e("c", "2026-10-05T13:00:00Z", "2026-10-05T14:00:00Z"),
      e("a", "2026-10-05T09:00:00Z", "2026-10-05T11:00:00Z"),
      e("b", "2026-10-05T10:00:00Z", "2026-10-05T12:00:00Z"),
    ];
    expect(findOverlaps(list)).toEqual([{ a: "a", b: "b", seconds: 3600 }]);
  });
  it("returns an empty list when nothing overlaps", () => {
    expect(findOverlaps([e("a", "2026-10-05T09:00:00Z", "2026-10-05T10:00:00Z")])).toEqual([]);
  });
});
