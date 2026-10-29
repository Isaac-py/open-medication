import { describe, expect, it } from "vitest";
import { nextAlarm } from "../src/alarm";
import type { Snooze } from "../src/types";
import { doseLog, schedule } from "./support";

function snooze(until: Date, scheduledFor = new Date(2026, 9, 29, 9, 0, 0)): Snooze {
  return { scheduleId: "s1", scheduledFor: scheduledFor.toISOString(), until: until.toISOString() };
}

describe("nextAlarm", () => {
  it("fires at the scheduled time when the dose is still ahead", () => {
    const now = new Date(2026, 9, 29, 8, 0, 0);
    const alarm = nextAlarm([schedule()], [], now);

    expect(alarm?.scheduledFor).toEqual(new Date(2026, 9, 29, 9, 0, 0));
    expect(alarm?.fireAt).toEqual(new Date(2026, 9, 29, 9, 0, 0));
  });

  it("fires immediately when the dose is inside the grace window", () => {
    const now = new Date(2026, 9, 29, 9, 30, 0);
    const alarm = nextAlarm([schedule()], [], now);

    expect(alarm?.scheduledFor).toEqual(new Date(2026, 9, 29, 9, 0, 0));
    expect(alarm?.fireAt).toEqual(now);
  });

  it("skips a dose that was already logged and waits for the next day", () => {
    const now = new Date(2026, 9, 29, 8, 0, 0);
    const alarm = nextAlarm([schedule()], [doseLog()], now);

    expect(alarm?.scheduledFor).toEqual(new Date(2026, 9, 30, 9, 0, 0));
  });

  it("waits for the next matching weekday", () => {
    const now = new Date(2026, 9, 29, 10, 0, 0);
    const alarm = nextAlarm([schedule({ daysOfWeek: [1], hour: 8 })], [], now);

    expect(alarm?.scheduledFor).toEqual(new Date(2026, 10, 2, 8, 0, 0));
  });

  it("still rings for yesterday when the grace window has not closed", () => {
    const now = new Date(2026, 9, 29, 0, 30, 0);
    const alarm = nextAlarm([schedule({ hour: 23, minute: 0, graceMinutes: 120 })], [], now);

    expect(alarm?.scheduledFor).toEqual(new Date(2026, 9, 28, 23, 0, 0));
    expect(alarm?.fireAt).toEqual(now);
  });

  it("picks the earlier of two medicines", () => {
    const now = new Date(2026, 9, 29, 7, 0, 0);
    const alarm = nextAlarm(
      [schedule({ id: "late", hour: 21 }), schedule({ id: "early", hour: 8 })],
      [],
      now,
    );

    expect(alarm?.scheduleId).toBe("early");
  });

  it("waits until a snoozed dose is due again", () => {
    const now = new Date(2026, 9, 29, 9, 5, 0);
    const until = new Date(2026, 9, 29, 9, 15, 0);
    const alarm = nextAlarm([schedule()], [], now, [snooze(until)]);

    expect(alarm?.fireAt).toEqual(until);
    expect(alarm?.scheduledFor).toEqual(new Date(2026, 9, 29, 9, 0, 0));
  });

  it("still rings at the snooze time after the grace window has closed", () => {
    const now = new Date(2026, 9, 29, 10, 5, 0);
    const until = new Date(2026, 9, 29, 10, 10, 0);
    const alarm = nextAlarm([schedule()], [], now, [snooze(until)]);

    expect(alarm?.fireAt).toEqual(until);
  });

  it("rings immediately when the snooze has already expired", () => {
    const now = new Date(2026, 9, 29, 9, 20, 0);
    const alarm = nextAlarm([schedule()], [], now, [snooze(new Date(2026, 9, 29, 9, 10, 0))]);

    expect(alarm?.fireAt).toEqual(now);
  });

  it("ignores a schedule with no weekdays", () => {
    const now = new Date(2026, 9, 29, 8, 0, 0);
    expect(nextAlarm([schedule({ daysOfWeek: [] })], [], now)).toBeNull();
  });
});
