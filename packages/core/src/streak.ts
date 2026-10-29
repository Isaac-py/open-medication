import { occurrencesBetween } from "./schedule";
import type { DoseLog, Schedule } from "./types";
import { addDays, occurrenceKey, startOfDay } from "./time";

export function streakCount(schedules: Schedule[], logs: DoseLog[], now: Date): number {
  const taken = new Set(
    logs.filter((log) => log.status === "taken").map((log) => occurrenceKey(log.scheduleId, log.scheduledFor)),
  );
  let count = dayState(schedules, taken, startOfDay(now)) === "complete" ? 1 : 0;
  let cursor = addDays(startOfDay(now), -1);

  for (let guard = 0; guard < 366; guard += 1) {
    const state = dayState(schedules, taken, cursor);
    if (state === "broken") break;
    if (state === "complete") count += 1;
    cursor = addDays(cursor, -1);
  }

  return count;
}

export function visibleStreak(count: number): number | null {
  return count >= 2 ? count : null;
}

function dayState(schedules: Schedule[], taken: Set<string>, day: Date): "empty" | "complete" | "broken" {
  const occurrences = occurrencesBetween(schedules, day, addDays(day, 1));
  if (occurrences.length === 0) return "empty";
  const complete = occurrences.every((occurrence) =>
    taken.has(occurrenceKey(occurrence.scheduleId, occurrence.scheduledFor)),
  );
  return complete ? "complete" : "broken";
}
