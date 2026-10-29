export type FoodRequirement = "with_food" | "empty_stomach" | "no_preference";

export type DoseStatus = "taken" | "skipped" | "missed";

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  foodRequirement: FoodRequirement;
  note: string | null;
  archivedAt: string | null;
  updatedAt: string;
}

export interface Schedule {
  id: string;
  medicationId: string;
  hour: number;
  minute: number;
  daysOfWeek: number[];
  graceMinutes: number;
  updatedAt: string;
}

export interface DoseLog {
  id: string;
  medicationId: string;
  scheduleId: string | null;
  scheduledFor: string;
  status: DoseStatus;
  takenAt: string | null;
  withFood: boolean | null;
  device: string | null;
  updatedAt: string;
}

export interface Snooze {
  scheduleId: string;
  scheduledFor: string;
  until: string;
}
