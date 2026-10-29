import { buildToday, type DoseLog, type TodayDose } from "@open-medication/core";
import { useCallback, useEffect, useState } from "react";
import { loadLibrary, saveDoseLog, saveSnooze, type Library } from "../api";

export function Today() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLibrary(await loadLibrary());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load today's doses");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const doses = library
    ? buildToday(library.medications, library.schedules, library.doseLogs, new Date(), library.snoozes)
    : [];

  async function log(dose: TodayDose, status: DoseLog["status"], withFood: boolean | null) {
    const now = new Date().toISOString();
    await saveDoseLog({
      id: dose.logId ?? crypto.randomUUID(),
      medicationId: dose.medicationId,
      scheduleId: dose.scheduleId,
      scheduledFor: dose.scheduledFor,
      status,
      takenAt: status === "taken" ? now : null,
      withFood,
      device: "laptop",
      updatedAt: now,
    });
    await refresh();
  }

  async function snooze(dose: TodayDose) {
    const until = new Date(Date.now() + 10 * 60_000).toISOString();
    await saveSnooze({ scheduleId: dose.scheduleId, scheduledFor: dose.scheduledFor, until });
    await refresh();
  }

  return (
    <section>
      <header className="page-head">
        <p className="eyebrow">Today</p>
        <h1>Doses</h1>
      </header>
      {error ? <p className="error">{error}</p> : null}
      {library && doses.length === 0 ? <p className="empty">Nothing scheduled today.</p> : null}
      <ul className="dose-list">
        {doses.map((dose) => (
          <li key={`${dose.scheduleId}-${dose.scheduledFor}`} className="card">
            <div>
              <strong>{dose.medicationName}</strong>
              <p>
                {formatTime(dose.scheduledFor)} · {dose.dosage} · {dose.foodText}
              </p>
              {dose.streak ? <p className="streak">{dose.streak} day streak</p> : null}
            </div>
            <p className={`state state-${dose.state}`}>{label(dose.state)}</p>
            {dose.state === "taken" || dose.state === "skipped" ? null : (
              <div className="actions">
                <button type="button" onClick={() => void log(dose, "taken", true)}>
                  Taken with food
                </button>
                <button type="button" onClick={() => void log(dose, "taken", false)}>
                  Taken without food
                </button>
                <button type="button" onClick={() => void snooze(dose)}>
                  Snooze 10 min
                </button>
                <button type="button" onClick={() => void log(dose, "skipped", null)}>
                  Skip
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

function label(state: TodayDose["state"]): string {
  if (state === "upcoming") return "Upcoming";
  if (state === "due") return "Due";
  if (state === "taken") return "Taken";
  if (state === "skipped") return "Skipped";
  return "Missed";
}
