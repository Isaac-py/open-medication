import { describe, expect, it } from "vitest";
import { streakCount, visibleStreak } from "../src/streak";
import { doseLog, schedule } from "./support";

function takenOn(day: Date, hour = 8): ReturnType<typeof doseLog> {
  const scheduledFor = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0);
  return doseLog({
    id: scheduledFor.toISOString(),
    scheduledFor: scheduledFor.toISOString(),
    status: "taken",
    takenAt: scheduledFor.toISOString(),
  });
}

describe("streakCount", () => {
  const daily = schedule({ hour: 8 });

  it("stays at one day until a second day is complete", () => {
    const now = new Date(2026, 9, 29, 7, 0, 0);
    expect(streakCount([daily], [takenOn(new Date(2026, 9, 28))], now)).toBe(1);
    expect(visibleStreak(1)).toBeNull();
  });

  it("counts a streak after two complete days", () => {
    const now = new Date(2026, 9, 29, 7, 0, 0);
    const logs = [takenOn(new Date(2026, 9, 27)), takenOn(new Date(2026, 9, 28))];
    expect(streakCount([daily], logs, now)).toBe(2);
    expect(visibleStreak(2)).toBe(2);
  });

  it("adds today once today's doses are already taken", () => {
    const now = new Date(2026, 9, 29, 12, 0, 0);
    const logs = [
      takenOn(new Date(2026, 9, 27)),
      takenOn(new Date(2026, 9, 28)),
      takenOn(new Date(2026, 9, 29)),
    ];
    expect(streakCount([daily], logs, now)).toBe(3);
  });

  it("resets when a scheduled day was missed", () => {
    const now = new Date(2026, 9, 29, 7, 0, 0);
    const logs = [
      takenOn(new Date(2026, 9, 27)),
      doseLog({
        scheduledFor: new Date(2026, 9, 28, 8, 0, 0).toISOString(),
        status: "missed",
        takenAt: null,
      }),
    ];
    expect(streakCount([daily], logs, now)).toBe(0);
  });

  it("keeps the streak across days with no scheduled dose", () => {
    const weekdays = schedule({ hour: 8, daysOfWeek: [1, 2, 3, 4, 5] });
    const now = new Date(2026, 9, 27, 7, 0, 0);
    const logs = [takenOn(new Date(2026, 9, 23)), takenOn(new Date(2026, 9, 26))];
    expect(streakCount([weekdays], logs, now)).toBe(2);
  });
});
