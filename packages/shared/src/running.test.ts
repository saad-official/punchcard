import { clockIn, clockOut, endBreak, IDLE, isOnBreak, nudgeAt, startBreak, switchJob, type ClockState } from "./running";

const C1 = "0199b3a0-0000-7000-8000-0000000000c1";
const C2 = "0199b3a0-0000-7000-8000-0000000000c2";
const J1 = "0199b3a0-0000-7000-8000-0000000000a1";
const E1 = "0199b3a0-0000-7000-8000-0000000000e1";
const E2 = "0199b3a0-0000-7000-8000-0000000000e2";
const T0 = "2026-10-05T13:00:00.000Z";
const T1 = "2026-10-05T14:00:00.000Z";
const T2 = "2026-10-05T14:15:00.000Z";
const T3 = "2026-10-05T16:00:00.000Z";

const running = (): ClockState => clockIn(IDLE, { id: E1, clientId: C1, now: T0, source: "manual" }).state;

describe("clockIn", () => {
  it("starts a running entry from idle", () => {
    const { state, events } = clockIn(IDLE, { id: E1, clientId: C1, jobId: J1, now: T0, source: "widget" });
    expect(state.running).toMatchObject({
      id: E1, clientId: C1, jobId: J1, startedAt: T0, endedAt: null, breakSeconds: 0, breakStartedAt: null,
      note: "", source: "widget", createdAt: T0, updatedAt: T0,
    });
    expect(events).toEqual([{ type: "entry.started", entry: state.running }]);
  });
  it("normalises now to a UTC ISO string", () => {
    const { state } = clockIn(IDLE, { id: E1, clientId: C1, now: "2026-10-05T09:00:00-04:00", source: "manual" });
    expect(state.running?.startedAt).toBe(T0);
  });
  it("is a no-op when the same client and job is already running", () => {
    const s = running();
    const out = clockIn(s, { id: E2, clientId: C1, now: T1, source: "manual" });
    expect(out.state).toBe(s);
    expect(out.events).toEqual([]);
  });
  it("switches when a different client is already running, keeping one running entry", () => {
    const out = clockIn(running(), { id: E2, clientId: C2, now: T1, source: "manual" });
    expect(out.events.map((e) => e.type)).toEqual(["entry.ended", "entry.started"]);
    expect(out.state.running?.id).toBe(E2);
  });
  it("does not mutate the input state", () => {
    const s = running();
    const snapshot = structuredClone(s);
    clockOut(s, { now: T1 });
    expect(s).toEqual(snapshot);
  });
});

describe("switchJob", () => {
  it("ends the current entry and starts the next at the same instant", () => {
    const { state, events } = switchJob(running(), { id: E2, clientId: C2, jobId: J1, now: T1 });
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ type: "entry.ended", entry: { id: E1, endedAt: T1, updatedAt: T1 } });
    expect(events[1]).toMatchObject({ type: "entry.started", entry: { id: E2, clientId: C2, jobId: J1, startedAt: T1 } });
    expect(state.running?.id).toBe(E2);
  });
  it("inherits the previous entry's source unless given one", () => {
    expect(switchJob(running(), { id: E2, clientId: C2, now: T1 }).state.running?.source).toBe("manual");
    expect(switchJob(running(), { id: E2, clientId: C2, now: T1, source: "live_activity" }).state.running?.source).toBe("live_activity");
  });
  it("closes an open break on the old entry before ending it", () => {
    const onBreak = startBreak(running(), { now: T1 }).state;
    const { events } = switchJob(onBreak, { id: E2, clientId: C2, now: T2 });
    expect(events.map((e) => e.type)).toEqual(["break.ended", "entry.ended", "entry.started"]);
    expect(events[1]?.entry).toMatchObject({ breakSeconds: 900, breakStartedAt: null });
  });
  it("starts an entry when idle", () => {
    const { state, events } = switchJob(IDLE, { id: E2, clientId: C2, now: T1 });
    expect(events.map((e) => e.type)).toEqual(["entry.started"]);
    expect(state.running?.source).toBe("manual");
  });
});

describe("breaks", () => {
  it("startBreak marks the running entry as on break", () => {
    const { state, events } = startBreak(running(), { now: T1 });
    expect(state.running?.breakStartedAt).toBe(T1);
    expect(isOnBreak(state.running)).toBe(true);
    expect(events).toEqual([{ type: "break.started", entry: state.running }]);
  });
  it("endBreak accumulates break time into breakSeconds", () => {
    const onBreak = startBreak(running(), { now: T1 }).state;
    const { state, events } = endBreak(onBreak, { now: T2 });
    expect(state.running).toMatchObject({ breakSeconds: 900, breakStartedAt: null, updatedAt: T2 });
    expect(events.map((e) => e.type)).toEqual(["break.ended"]);
  });
  it("adds successive breaks together", () => {
    let s = running();
    s = endBreak(startBreak(s, { now: T1 }).state, { now: T2 }).state;
    s = endBreak(startBreak(s, { now: "2026-10-05T15:00:00.000Z" }).state, { now: "2026-10-05T15:10:00.000Z" }).state;
    expect(s.running?.breakSeconds).toBe(1500);
  });
  it("ignores startBreak when idle or already on break", () => {
    expect(startBreak(IDLE, { now: T1 }).events).toEqual([]);
    const onBreak = startBreak(running(), { now: T1 }).state;
    const again = startBreak(onBreak, { now: T2 });
    expect(again.events).toEqual([]);
    expect(again.state.running?.breakStartedAt).toBe(T1);
  });
  it("ignores endBreak when not on break", () => {
    const s = running();
    expect(endBreak(s, { now: T1 })).toEqual({ state: s, events: [] });
    expect(endBreak(IDLE, { now: T1 }).events).toEqual([]);
  });
  it("isOnBreak is false for null and for an entry without an open break", () => {
    expect(isOnBreak(null)).toBe(false);
    expect(isOnBreak(running().running)).toBe(false);
  });
});

describe("clockOut", () => {
  it("ends the running entry and returns to idle", () => {
    const { state, events } = clockOut(running(), { now: T3 });
    expect(state).toEqual(IDLE);
    expect(events).toEqual([{ type: "entry.ended", entry: expect.objectContaining({ id: E1, endedAt: T3, updatedAt: T3 }) }]);
  });
  it("closes an open break first", () => {
    const onBreak = startBreak(running(), { now: T1 }).state;
    const { events } = clockOut(onBreak, { now: T2 });
    expect(events.map((e) => e.type)).toEqual(["break.ended", "entry.ended"]);
    expect(events[1]?.entry.breakSeconds).toBe(900);
  });
  it("is a no-op with no events when nothing is running", () => {
    expect(clockOut(IDLE, { now: T1 })).toEqual({ state: IDLE, events: [] });
  });
  it("never ends an entry before it started", () => {
    const { events } = clockOut(running(), { now: "2026-10-05T12:00:00.000Z" });
    expect(events[0]?.entry.endedAt).toBe(T0);
  });
});

describe("nudgeAt", () => {
  it("is startedAt plus the nudge hours for a running entry", () => {
    expect(nudgeAt(running().running!, 10)).toBe("2026-10-05T23:00:00.000Z");
  });
  it("defaults to 10 hours and supports fractions", () => {
    expect(nudgeAt(running().running!)).toBe("2026-10-05T23:00:00.000Z");
    expect(nudgeAt(running().running!, 0.5)).toBe("2026-10-05T13:30:00.000Z");
  });
  it("is null for a finished entry", () => {
    const ended = clockOut(running(), { now: T1 }).events[0]!.entry;
    expect(nudgeAt(ended, 10)).toBeNull();
  });
});
