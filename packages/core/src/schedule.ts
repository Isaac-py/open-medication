import type { Schedule } from "./types";
import { addDays, atTime, startOfDay } from "./time";

export interface Occurrence {
  scheduleId: string;
  medicationId: string;
  scheduledFor: Date;
  graceEndsAt: Date;
}

export function isValidSchedule(schedule: Schedule): boolean {
  if (!schedule.id || !schedule.medicationId) return false;
  if (!Number.isInteger(schedule.hour) || schedule.hour < 0 || schedule.hour > 23) return false;
  if (!Number.isInteger(schedule.minute) || schedule.minute < 0 || schedule.minute > 59) return false;
  if (!Number.isInteger(schedule.graceMinutes) || schedule.graceMinutes < 1 || schedule.graceMinutes > 24 * 60) {
    return false;
  }
  if (schedule.daysOfWeek.length === 0) return false;
  const days = new Set(schedule.daysOfWeek);
  if (days.size !== schedule.daysOfWeek.length) return false;
  return schedule.daysOfWeek.every((day) => Number.isInteger(day) && day >= 0 && day <= 6);
}

export function occurrencesBetween(schedules: Schedule[], rangeStart: Date, rangeEnd: Date): Occurrence[] {
  const results: Occurrence[] = [];
  const firstDay = startOfDay(rangeStart);
  const lastDay = startOfDay(new Date(rangeEnd.getTime() - 1));

  for (const schedule of schedules) {
    if (!isValidSchedule(schedule)) continue;
    for (let day = firstDay; day.getTime() <= lastDay.getTime(); day = addDays(day, 1)) {
      if (!schedule.daysOfWeek.includes(day.getDay())) continue;
      const scheduledFor = atTime(day, schedule.hour, schedule.minute);
      if (scheduledFor < rangeStart || scheduledFor >= rangeEnd) continue;
      results.push(toOccurrence(schedule, scheduledFor));
    }
  }

  results.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  return results;
}

export function toOccurrence(schedule: Schedule, scheduledFor: Date): Occurrence {
  return {
    scheduleId: schedule.id,
    medicationId: schedule.medicationId,
    scheduledFor,
    graceEndsAt: new Date(scheduledFor.getTime() + schedule.graceMinutes * 60_000),
  };
}

export function lookbackDays(graceMinutes: number): number {
  return Math.ceil(graceMinutes / (60 * 24)) + 1;
}

export function eachScheduledDay(
  schedule: Schedule,
  fromOffset: number,
  toOffset: number,
  now: Date,
): Occurrence[] {
  const results: Occurrence[] = [];
  for (let offset = fromOffset; offset <= toOffset; offset += 1) {
    const day = addDays(startOfDay(now), offset);
    if (!schedule.daysOfWeek.includes(day.getDay())) continue;
    results.push(toOccurrence(schedule, atTime(day, schedule.hour, schedule.minute)));
  }
  return results;
}
