import { describe, expect, it } from "vitest";
import { occurrencesToMarkMissed } from "../src/missed";
import { doseLog, schedule } from "./support";

const todayAtNine = new Date(2026, 9, 29, 9, 0, 0);

function includesToday(occurrences: { scheduledFor: Date }[]): boolean {
  return occurrences.some((occurrence) => occurrence.scheduledFor.getTime() === todayAtNine.getTime());
}

describe("occurrencesToMarkMissed", () => {
  it("marks a dose missed after the grace window closes", () => {
    const now = new Date(2026, 9, 29, 11, 0, 0);
    expect(includesToday(occurrencesToMarkMissed([schedule()], [], now))).toBe(true);
  });

  it("leaves a dose alone while the grace window is open", () => {
    const now = new Date(2026, 9, 29, 9, 30, 0);
    expect(includesToday(occurrencesToMarkMissed([schedule()], [], now))).toBe(false);
  });

  it("does not mark a dose that was already logged", () => {
    const now = new Date(2026, 9, 29, 12, 0, 0);
    expect(includesToday(occurrencesToMarkMissed([schedule()], [doseLog()], now))).toBe(false);
  });

  it("waits out a snooze that runs past the grace window", () => {
    const now = new Date(2026, 9, 29, 10, 5, 0);
    const snoozes = [
      {
        scheduleId: "s1",
        scheduledFor: todayAtNine.toISOString(),
        until: new Date(2026, 9, 29, 10, 10, 0).toISOString(),
      },
    ];

    expect(includesToday(occurrencesToMarkMissed([schedule()], [], now, snoozes))).toBe(false);
  });

  it("marks a snoozed dose once the snooze and the grace window are both over", () => {
    const now = new Date(2026, 9, 29, 10, 15, 0);
    const snoozes = [
      {
        scheduleId: "s1",
        scheduledFor: todayAtNine.toISOString(),
        until: new Date(2026, 9, 29, 10, 10, 0).toISOString(),
      },
    ];

    expect(includesToday(occurrencesToMarkMissed([schedule()], [], now, snoozes))).toBe(true);
  });
});
