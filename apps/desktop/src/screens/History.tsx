import { buildHistory, type DoseStatus } from "@open-medication/core";
import { useCallback, useEffect, useState } from "react";
import { loadLibrary, saveDoseLog, type Library } from "../api";

export function History() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLibrary(await loadLibrary());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load history");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const days = library ? buildHistory(library.medications, library.doseLogs) : [];

  async function correct(logId: string, status: DoseStatus, withFood: boolean | null) {
    const log = library?.doseLogs.find((entry) => entry.id === logId);
    if (!log) return;
    await saveDoseLog({
      ...log,
      status,
      withFood,
      takenAt: status === "taken" ? (log.takenAt ?? new Date().toISOString()) : null,
      updatedAt: new Date().toISOString(),
    });
    await refresh();
  }

  return (
    <section>
      <header className="page-head">
        <p className="eyebrow">History</p>
        <h1>What you logged</h1>
      </header>
      {error ? <p className="error">{error}</p> : null}
      {library && days.length === 0 ? <p className="empty">No doses logged yet.</p> : null}
      {days.map((day) => (
        <section key={day.day} className="history-day">
          <h2>{day.day}</h2>
          <ul className="dose-list">
            {day.entries.map((entry) => (
              <li key={entry.logId} className="card">
                <strong>{entry.medicationName}</strong>
                <p>
                  {formatTime(entry.scheduledFor)} · {entry.status}
                  {entry.withFood === true ? " · with food" : ""}
                  {entry.withFood === false ? " · without food" : ""}
                </p>
                <div className="actions">
                  <button type="button" onClick={() => void correct(entry.logId, "taken", true)}>
                    With food
                  </button>
                  <button type="button" onClick={() => void correct(entry.logId, "taken", false)}>
                    Without food
                  </button>
                  <button type="button" className="quiet" onClick={() => void correct(entry.logId, "skipped", null)}>
                    Skipped
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}
