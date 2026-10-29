import type { DoseLog, Schedule } from "../src/types";

export function schedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: "s1",
    medicationId: "m1",
    hour: 9,
    minute: 0,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    graceMinutes: 60,
    updatedAt: "2026-10-29T00:00:00.000Z",
    ...overrides,
  };
}

export function doseLog(overrides: Partial<DoseLog> = {}): DoseLog {
  return {
    id: "log1",
    medicationId: "m1",
    scheduleId: "s1",
    scheduledFor: new Date(2026, 9, 29, 9, 0, 0).toISOString(),
    status: "taken",
    takenAt: new Date(2026, 9, 29, 9, 5, 0).toISOString(),
    withFood: true,
    device: "laptop",
    updatedAt: "2026-10-29T13:05:00.000Z",
    ...overrides,
  };
}
