import { invoke } from "@tauri-apps/api/core";
import type { DoseLog, Medication, Schedule, Snooze } from "@open-medication/core";

export interface Library {
  medications: Medication[];
  schedules: Schedule[];
  doseLogs: DoseLog[];
  snoozes: Snooze[];
}

export function loadLibrary(): Promise<Library> {
  return invoke("load_library");
}

export function saveDoseLog(doseLog: DoseLog): Promise<void> {
  return invoke("save_dose_log", { doseLog });
}

export function saveSnooze(snooze: Snooze): Promise<void> {
  return invoke("save_snooze", { snooze });
}
