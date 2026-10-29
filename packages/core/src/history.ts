import type { DoseLog, DoseStatus, Medication } from "./types";
import { dayKey } from "./time";

export interface HistoryEntry {
  logId: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  scheduledFor: string;
  status: DoseStatus;
  withFood: boolean | null;
  takenAt: string | null;
}

export interface HistoryDay {
  day: string;
  entries: HistoryEntry[];
}

export function buildHistory(medications: Medication[], logs: DoseLog[]): HistoryDay[] {
  const byMedication = new Map(medications.map((medication) => [medication.id, medication]));
  const grouped = new Map<string, HistoryEntry[]>();

  for (const log of logs) {
    const medication = byMedication.get(log.medicationId);
    const day = dayKey(new Date(log.scheduledFor));
    const entry: HistoryEntry = {
      logId: log.id,
      medicationId: log.medicationId,
      medicationName: medication?.name ?? "Medicine",
      dosage: medication?.dosage ?? "",
      scheduledFor: log.scheduledFor,
      status: log.status,
      withFood: log.withFood,
      takenAt: log.takenAt,
    };
    const entries = grouped.get(day) ?? [];
    entries.push(entry);
    grouped.set(day, entries);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => (left < right ? 1 : -1))
    .map(([day, entries]) => ({
      day,
      entries: entries.sort((left, right) => Date.parse(right.scheduledFor) - Date.parse(left.scheduledFor)),
    }));
}
