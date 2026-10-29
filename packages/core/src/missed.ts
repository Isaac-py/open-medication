import { eachScheduledDay, isValidSchedule, lookbackDays, type Occurrence } from "./schedule";
import type { DoseLog, Schedule, Snooze } from "./types";
import { occurrenceKey } from "./time";

export function occurrencesToMarkMissed(
  schedules: Schedule[],
  logs: DoseLog[],
  now: Date,
  snoozes: Snooze[] = [],
  historyDays = 7,
): Occurrence[] {
  const logged = new Set(logs.map((log) => occurrenceKey(log.scheduleId, log.scheduledFor)));
  const snoozeUntil = new Map(
    snoozes.map((snooze) => [occurrenceKey(snooze.scheduleId, snooze.scheduledFor), Date.parse(snooze.until)]),
  );
  const missed: Occurrence[] = [];

  for (const schedule of schedules) {
    if (!isValidSchedule(schedule)) continue;
    const from = -Math.max(historyDays, lookbackDays(schedule.graceMinutes));
    for (const occurrence of eachScheduledDay(schedule, from, 0, now)) {
      if (occurrence.scheduledFor.getTime() > now.getTime()) continue;
      const key = occurrenceKey(occurrence.scheduleId, occurrence.scheduledFor);
      if (logged.has(key)) continue;
      const until = snoozeUntil.get(key);
      if (until !== undefined && now.getTime() < until) continue;
      if (now.getTime() < occurrence.graceEndsAt.getTime()) continue;
      missed.push(occurrence);
    }
  }

  missed.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  return missed;
}
