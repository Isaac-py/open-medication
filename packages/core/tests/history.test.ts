import { describe, expect, it } from "vitest";
import { buildHistory } from "../src/history";
import { doseLog, medication } from "./support";

describe("buildHistory", () => {
  it("groups logs by day with the newest day first", () => {
    const logs = [
      doseLog({
        id: "older",
        scheduledFor: new Date(2026, 9, 28, 9, 0, 0).toISOString(),
        status: "missed",
        withFood: null,
        takenAt: null,
      }),
      doseLog({
        id: "newer",
        scheduledFor: new Date(2026, 9, 29, 21, 0, 0).toISOString(),
        status: "taken",
        withFood: false,
      }),
      doseLog({ id: "morning", scheduledFor: new Date(2026, 9, 29, 9, 0, 0).toISOString() }),
    ];

    const days = buildHistory([medication()], logs);

    expect(days.map((day) => day.day)).toEqual(["2026-10-29", "2026-10-28"]);
    expect(days[0]?.entries.map((entry) => entry.logId)).toEqual(["newer", "morning"]);
    expect(days[0]?.entries[0]?.withFood).toBe(false);
    expect(days[0]?.entries[0]?.medicationName).toBe("Lisinopril");
    expect(days[1]?.entries[0]?.status).toBe("missed");
  });
});
