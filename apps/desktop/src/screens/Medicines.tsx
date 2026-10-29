import type { FoodRequirement, Medication } from "@open-medication/core";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { deleteSchedule, loadLibrary, removeMedication, saveMedication, saveSchedule, type Library } from "../api";

const foodOptions: { value: FoodRequirement; label: string }[] = [
  { value: "with_food", label: "With food" },
  { value: "empty_stomach", label: "Without food" },
  { value: "no_preference", label: "Either" },
];

export function Medicines() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [foodRequirement, setFoodRequirement] = useState<FoodRequirement>("with_food");
  const [time, setTime] = useState("09:00");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLibrary(await loadLibrary());
  }, []);

  useEffect(() => {
    void refresh().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : "Could not load medicines");
    });
  }, [refresh]);

  async function addMedicine(event: FormEvent) {
    event.preventDefault();
    const [hourText, minuteText] = time.split(":");
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (!name.trim() || Number.isNaN(hour) || Number.isNaN(minute)) {
      setError("Add a name and a time.");
      return;
    }
    const now = new Date().toISOString();
    const medicationId = crypto.randomUUID();
    await saveMedication({
      id: medicationId,
      name: name.trim(),
      dosage: dosage.trim(),
      foodRequirement,
      note: null,
      archivedAt: null,
      updatedAt: now,
    });
    await saveSchedule({
      id: crypto.randomUUID(),
      medicationId,
      hour,
      minute,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      graceMinutes: 60,
      updatedAt: now,
    });
    setName("");
    setDosage("");
    setError(null);
    await refresh();
  }

  async function remove(medication: Medication) {
    const schedules = library?.schedules.filter((schedule) => schedule.medicationId === medication.id) ?? [];
    const result = await removeMedication(medication.id, new Date().toISOString());
    if (result.deleted) {
      await Promise.all(schedules.map((schedule) => deleteSchedule(schedule.id)));
    }
    await refresh();
  }

  const active = library?.medications.filter((medication) => medication.archivedAt === null) ?? [];

  return (
    <section>
      <header className="page-head">
        <p className="eyebrow">Medicines</p>
        <h1>Your list</h1>
      </header>
      {error ? <p className="error">{error}</p> : null}
      <form className="card form" onSubmit={(event) => void addMedicine(event)}>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Dose
          <input value={dosage} onChange={(event) => setDosage(event.target.value)} placeholder="10 mg" />
        </label>
        <label>
          Food
          <select value={foodRequirement} onChange={(event) => setFoodRequirement(event.target.value as FoodRequirement)}>
            {foodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Time
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
        <button type="submit">Add medicine</button>
      </form>
      <ul className="dose-list">
        {active.map((medication) => (
          <li key={medication.id} className="card medicine-row">
            <div>
              <strong>{medication.name}</strong>
              <p>{medication.dosage || "No dose written down"}</p>
            </div>
            <button type="button" className="quiet" onClick={() => void remove(medication)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
