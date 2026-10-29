import { invoke } from "@tauri-apps/api/core";
import type { DoseLog, Medication, Schedule, Snooze } from "@open-medication/core";

export interface Removal {
  deleted: boolean;
  archived: boolean;
}

export interface Library {
  medications: Medication[];
  schedules: Schedule[];
  doseLogs: DoseLog[];
  snoozes: Snooze[];
}

export function loadLibrary(): Promise<Library> {
  return invoke("load_library");
}

export function saveMedication(medication: Medication): Promise<void> {
  return invoke("save_medication", { medication });
}

export function removeMedication(id: string, archivedAt: string): Promise<Removal> {
  return invoke("remove_medication", { id, archivedAt });
}

export function saveSchedule(schedule: Schedule): Promise<void> {
  return invoke("save_schedule", { schedule });
}

export function deleteSchedule(id: string): Promise<void> {
  return invoke("delete_schedule", { id });
}

export function saveDoseLog(doseLog: DoseLog): Promise<void> {
  return invoke("save_dose_log", { doseLog });
}

export function saveSnooze(snooze: Snooze): Promise<void> {
  return invoke("save_snooze", { snooze });
}
