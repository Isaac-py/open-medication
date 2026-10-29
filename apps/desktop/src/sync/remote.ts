import {
  mergeByUpdatedAt,
  mergeDoseLog,
  type DoseLog,
  type FoodRequirement,
  type Medication,
  type Schedule,
} from "@open-medication/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteDoseLog, loadLibrary, saveDoseLog, saveMedication, saveSchedule } from "../api";

interface RemoteMedication {
  id: string;
  name: string;
  dosage: string;
  food_requirement: FoodRequirement;
  note: string | null;
  archived_at: string | null;
  updated_at: string;
}

interface RemoteSchedule {
  id: string;
  medication_id: string;
  hour: number;
  minute: number;
  days_of_week: number[];
  grace_minutes: number;
  updated_at: string;
}

interface RemoteDoseLog {
  id: string;
  medication_id: string;
  schedule_id: string | null;
  scheduled_for: string;
  status: DoseLog["status"];
  taken_at: string | null;
  with_food: boolean | null;
  device: string | null;
  updated_at: string;
}

export async function pushAccount(client: SupabaseClient): Promise<void> {
  const user = await client.auth.getUser();
  if (user.error) throw user.error;
  const userId = user.data.user?.id;
  if (!userId) throw new Error("Sign in before pushing doses.");
  const library = await loadLibrary();

  if (library.medications.length > 0) {
    const saved = await client.from("medications").upsert(
      library.medications.map((medication) => ({
        id: medication.id,
        user_id: userId,
        name: medication.name,
        dosage: medication.dosage,
        food_requirement: medication.foodRequirement,
        note: medication.note,
        archived_at: medication.archivedAt,
        updated_at: medication.updatedAt,
      })),
    );
    if (saved.error) throw saved.error;
  }

  if (library.schedules.length > 0) {
    const saved = await client.from("schedules").upsert(
      library.schedules.map((schedule) => ({
        id: schedule.id,
        user_id: userId,
        medication_id: schedule.medicationId,
        hour: schedule.hour,
        minute: schedule.minute,
        days_of_week: schedule.daysOfWeek,
        grace_minutes: schedule.graceMinutes,
        updated_at: schedule.updatedAt,
      })),
    );
    if (saved.error) throw saved.error;
  }

  if (library.doseLogs.length > 0) {
    const saved = await client.from("dose_logs").upsert(
      library.doseLogs.map((log) => ({
        id: log.id,
        user_id: userId,
        medication_id: log.medicationId,
        schedule_id: log.scheduleId,
        scheduled_for: log.scheduledFor,
        status: log.status,
        taken_at: log.takenAt,
        with_food: log.withFood,
        device: log.device,
        updated_at: log.updatedAt,
      })),
    );
    if (saved.error) throw saved.error;
  }
}

export function subscribeAccount(client: SupabaseClient, onChange: () => void): () => void {
  const channel = client
    .channel("open-medication")
    .on("postgres_changes", { event: "*", schema: "public", table: "medications" }, () => {
      void pullAccount(client).then(onChange);
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, () => {
      void pullAccount(client).then(onChange);
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "dose_logs" }, () => {
      void pullAccount(client).then(onChange);
    })
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export async function pullAccount(client: SupabaseClient): Promise<void> {
  const library = await loadLibrary();
  const medications = await client
    .from("medications")
    .select("id, name, dosage, food_requirement, note, archived_at, updated_at");
  if (medications.error) throw medications.error;
  for (const row of medications.data as RemoteMedication[]) {
    const remote = toMedication(row);
    const local = library.medications.find((item) => item.id === remote.id);
    await saveMedication(local ? mergeByUpdatedAt(local, remote) : remote);
  }

  const schedules = await client
    .from("schedules")
    .select("id, medication_id, hour, minute, days_of_week, grace_minutes, updated_at");
  if (schedules.error) throw schedules.error;
  for (const row of schedules.data as RemoteSchedule[]) {
    const remote = toSchedule(row);
    const local = library.schedules.find((item) => item.id === remote.id);
    await saveSchedule(local ? mergeByUpdatedAt(local, remote) : remote);
  }

  const logs = await client
    .from("dose_logs")
    .select("id, medication_id, schedule_id, scheduled_for, status, taken_at, with_food, device, updated_at");
  if (logs.error) throw logs.error;
  for (const row of logs.data as RemoteDoseLog[]) {
    const remote = toDoseLog(row);
    const local = library.doseLogs.find(
      (item) =>
        item.id === remote.id ||
        (item.scheduleId === remote.scheduleId && Date.parse(item.scheduledFor) === Date.parse(remote.scheduledFor)),
    );
    if (!local) {
      await saveDoseLog(remote);
      continue;
    }
    const winner = mergeDoseLog(local, remote);
    await saveDoseLog({ ...winner, id: remote.id });
    if (local.id !== remote.id) await deleteDoseLog(local.id);
  }
}

function toMedication(row: RemoteMedication): Medication {
  return {
    id: row.id,
    name: row.name,
    dosage: row.dosage,
    foodRequirement: row.food_requirement,
    note: row.note,
    archivedAt: row.archived_at,
    updatedAt: row.updated_at,
  };
}

function toSchedule(row: RemoteSchedule): Schedule {
  return {
    id: row.id,
    medicationId: row.medication_id,
    hour: row.hour,
    minute: row.minute,
    daysOfWeek: row.days_of_week,
    graceMinutes: row.grace_minutes,
    updatedAt: row.updated_at,
  };
}

function toDoseLog(row: RemoteDoseLog): DoseLog {
  return {
    id: row.id,
    medicationId: row.medication_id,
    scheduleId: row.schedule_id,
    scheduledFor: row.scheduled_for,
    status: row.status,
    takenAt: row.taken_at,
    withFood: row.with_food,
    device: row.device,
    updatedAt: row.updated_at,
  };
}
