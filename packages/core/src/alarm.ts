import { eachScheduledDay, isValidSchedule, lookbackDays } from "./schedule";
import type { DoseLog, Schedule } from "./types";
import { occurrenceKey } from "./time";

export interface Alarm {
  scheduleId: string;
  medicationId: string;
  scheduledFor: Date;
  fireAt: Date;
  graceEndsAt: Date;
}

export function nextAlarm(schedules: Schedule[], logs: DoseLog[], now: Date): Alarm | null {
  const logged = new Set(logs.map((log) => occurrenceKey(log.scheduleId, log.scheduledFor)));
  let best: Alarm | null = null;

  for (const schedule of schedules) {
    if (!isValidSchedule(schedule)) continue;
    const occurrences = eachScheduledDay(schedule, -lookbackDays(schedule.graceMinutes), 8, now);
    for (const occurrence of occurrences) {
      if (now.getTime() >= occurrence.graceEndsAt.getTime()) continue;
      if (logged.has(occurrenceKey(occurrence.scheduleId, occurrence.scheduledFor))) continue;
      const fireAt = occurrence.scheduledFor.getTime() > now.getTime() ? occurrence.scheduledFor : now;
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
