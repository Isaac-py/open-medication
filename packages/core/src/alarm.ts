import { eachScheduledDay, isValidSchedule, lookbackDays } from "./schedule";
import type { DoseLog, Schedule, Snooze } from "./types";
import { occurrenceKey } from "./time";

export interface Alarm {
  scheduleId: string;
  medicationId: string;
  scheduledFor: Date;
  fireAt: Date;
  graceEndsAt: Date;
}

export function nextAlarm(
  schedules: Schedule[],
  logs: DoseLog[],
  now: Date,
  snoozes: Snooze[] = [],
): Alarm | null {
  const logged = new Set(logs.map((log) => occurrenceKey(log.scheduleId, log.scheduledFor)));
  const snoozeUntil = new Map(
    snoozes.map((snooze) => [occurrenceKey(snooze.scheduleId, snooze.scheduledFor), Date.parse(snooze.until)]),
  );
  let best: Alarm | null = null;

  for (const schedule of schedules) {
    if (!isValidSchedule(schedule)) continue;
    const occurrences = eachScheduledDay(schedule, -lookbackDays(schedule.graceMinutes), 8, now);
    for (const occurrence of occurrences) {
      const key = occurrenceKey(occurrence.scheduleId, occurrence.scheduledFor);
      const until = snoozeUntil.get(key);
      const snoozePending = until !== undefined && now.getTime() < until;
      if (now.getTime() >= occurrence.graceEndsAt.getTime() && !snoozePending) continue;
      if (logged.has(key)) continue;
      let fireAt = occurrence.scheduledFor.getTime() > now.getTime() ? occurrence.scheduledFor : now;
      if (until !== undefined && until > fireAt.getTime()) fireAt = new Date(until);
      const alarm: Alarm = { ...occurrence, fireAt };
      if (isEarlierAlarm(alarm, best)) best = alarm;
    }
  }

  return best;
}

function isEarlierAlarm(alarm: Alarm, best: Alarm | null): boolean {
  if (!best) return true;
  const fireDelta = alarm.fireAt.getTime() - best.fireAt.getTime();
  if (fireDelta !== 0) return fireDelta < 0;
  return alarm.scheduledFor.getTime() < best.scheduledFor.getTime();
}
