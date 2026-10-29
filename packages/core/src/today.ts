import { foodReminder } from "./food";
import { occurrencesBetween } from "./schedule";
import { streakCount, visibleStreak } from "./streak";
import type { DoseLog, FoodRequirement, Medication, Schedule, Snooze } from "./types";
import { addDays, occurrenceKey, startOfDay } from "./time";

export type TodayState = "upcoming" | "due" | "missed" | "taken" | "skipped";

export interface TodayDose {
  scheduleId: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  foodRequirement: FoodRequirement;
  foodText: string;
  scheduledFor: string;
  graceEndsAt: string;
  state: TodayState;
  withFood: boolean | null;
  logId: string | null;
  streak: number | null;
}

export function buildToday(
  medications: Medication[],
  schedules: Schedule[],
  logs: DoseLog[],
  now: Date,
  snoozes: Snooze[] = [],
): TodayDose[] {
  const active = medications.filter((medication) => medication.archivedAt === null);
  const activeIds = new Set(active.map((medication) => medication.id));
  const activeSchedules = schedules.filter((schedule) => activeIds.has(schedule.medicationId));
  const byMedication = new Map(active.map((medication) => [medication.id, medication]));
  const logsByKey = new Map(logs.map((log) => [occurrenceKey(log.scheduleId, log.scheduledFor), log]));
  const snoozeUntil = new Map(
    snoozes.map((snooze) => [occurrenceKey(snooze.scheduleId, snooze.scheduledFor), Date.parse(snooze.until)]),
  );
  const streaks = new Map(
    active.map((medication) => {
      const medSchedules = activeSchedules.filter((schedule) => schedule.medicationId === medication.id);
      return [medication.id, visibleStreak(streakCount(medSchedules, logs, now))] as const;
    }),
  );

  const day = startOfDay(now);
  const occurrences = occurrencesBetween(activeSchedules, addDays(day, -1), addDays(day, 1)).filter((occurrence) => {
    const key = occurrenceKey(occurrence.scheduleId, occurrence.scheduledFor);
    const until = snoozeUntil.get(key);
    const snoozePending = until !== undefined && now.getTime() < until;
    const onToday = occurrence.scheduledFor >= day;
    const stillOpen = now.getTime() < occurrence.graceEndsAt.getTime();
    return onToday || stillOpen || snoozePending;
  });

  return occurrences.map((occurrence) => {
    const medication = byMedication.get(occurrence.medicationId);
    const log = logsByKey.get(occurrenceKey(occurrence.scheduleId, occurrence.scheduledFor));
    const requirement = medication?.foodRequirement ?? "no_preference";
    return {
      scheduleId: occurrence.scheduleId,
      medicationId: occurrence.medicationId,
      medicationName: medication?.name ?? "Medicine",
      dosage: medication?.dosage ?? "",
      foodRequirement: requirement,
      foodText: foodReminder(requirement),
      scheduledFor: occurrence.scheduledFor.toISOString(),
      graceEndsAt: occurrence.graceEndsAt.toISOString(),
      state: doseState(occurrence.scheduledFor, occurrence.graceEndsAt, log, now),
      withFood: log?.withFood ?? null,
      logId: log?.id ?? null,
      streak: streaks.get(occurrence.medicationId) ?? null,
    };
  });
}

function doseState(
  scheduledFor: Date,
  graceEndsAt: Date,
  log: DoseLog | undefined,
  now: Date,
): TodayState {
  if (log?.status === "taken" || log?.status === "skipped" || log?.status === "missed") return log.status;
  if (now.getTime() >= graceEndsAt.getTime()) return "missed";
  if (now.getTime() >= scheduledFor.getTime()) return "due";
  return "upcoming";
}
