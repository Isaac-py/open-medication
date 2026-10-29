use std::sync::Mutex;

use rusqlite::Connection;
use tauri::State;

use crate::db::{self, DoseLogRow, Library, MedicationRow, Removal, ScheduleRow, SnoozeRow};
use crate::scheduler::{self, Wake};

pub struct AppDb {
    pub connection: Mutex<Connection>,
    pub wake: Wake,
}

fn mutate<T>(db: &AppDb, write: impl FnOnce(&Connection) -> Result<T, String>) -> Result<T, String> {
    let result = {
        let connection = db.connection.lock().map_err(|error| error.to_string())?;
        write(&connection)
    };
    if result.is_ok() {
        scheduler::poke(&db.wake);
    }
    result
}

#[tauri::command]
pub fn load_library(db: State<AppDb>) -> Result<Library, String> {
    let connection = db.connection.lock().map_err(|error| error.to_string())?;
    db::load_library(&connection)
}

#[tauri::command]
pub fn save_medication(db: State<AppDb>, medication: MedicationRow) -> Result<(), String> {
    mutate(&db, |connection| db::upsert_medication(connection, &medication))
}

#[tauri::command]
pub fn remove_medication(db: State<AppDb>, id: String, archived_at: String) -> Result<Removal, String> {
    mutate(&db, |connection| db::remove_medication(connection, &id, &archived_at))
}

#[tauri::command]
pub fn save_schedule(db: State<AppDb>, schedule: ScheduleRow) -> Result<(), String> {
    mutate(&db, |connection| db::upsert_schedule(connection, &schedule))
}

#[tauri::command]
pub fn delete_schedule(db: State<AppDb>, id: String) -> Result<(), String> {
    mutate(&db, |connection| db::delete_schedule(connection, &id))
}

#[tauri::command]
pub fn save_dose_log(db: State<AppDb>, dose_log: DoseLogRow) -> Result<(), String> {
    mutate(&db, |connection| db::upsert_dose_log(connection, &dose_log))
}

#[tauri::command]
pub fn delete_dose_log(db: State<AppDb>, id: String) -> Result<(), String> {
    mutate(&db, |connection| db::delete_dose_log(connection, &id))
}

#[tauri::command]
pub fn save_snooze(db: State<AppDb>, snooze: SnoozeRow) -> Result<(), String> {
    mutate(&db, |connection| db::upsert_snooze(connection, &snooze))
}
