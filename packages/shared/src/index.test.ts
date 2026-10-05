import * as shared from "./index";

describe("package entry", () => {
  it("re-exports every module's public functions", () => {
    const names = [
      "isUuid", "newIdFrom", "ClientSchema", "CLIENT_PALETTE", "elapsedSeconds", "roundSeconds", "formatDuration",
      "splitAtMidnight", "earningsCents", "formatMoney", "startOfWeek", "weekRange", "bucketEntriesByDay",
      "bucketEntriesByWeek", "dayKey", "clockIn", "switchJob", "startBreak", "endBreak", "clockOut", "nudgeAt",
      "summarize", "toCsvRows", "csvEscape", "timesheetModel", "historyFloor", "gate", "canAddClient", "mergeRows",
      "diffDirty", "applyPull", "pullCursor", "planRemoteApply", "acceptPulledPhoto", "deferConflictingRunning", "formatAddressLabel", "formatCoordinates", "AppearanceSchema", "BusinessDetailsSchema", "haversineMeters", "isInside", "transition", "geofenceNudge",
    ];
    for (const n of names) expect(shared, n).toHaveProperty(n);
  });
});
