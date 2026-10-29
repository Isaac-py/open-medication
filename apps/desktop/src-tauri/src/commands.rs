use std::sync::Mutex;

use rusqlite::Connection;
use tauri::State;

use crate::db::{self, DoseLogRow, Library, MedicationRow, Removal, ScheduleRow, SnoozeRow};

pub struct AppDb(pub Mutex<Connection>);

#[tauri::command]
pub fn load_library(db: State<AppDb>) -> Result<Library, String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;
    db::load_library(&conn)
}

#[tauri::command]
pub fn save_medication(db: State<AppDb>, medication: MedicationRow) -> Result<(), String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;
    db::upsert_medication(&conn, &medication)
}

#[tauri::command]
pub fn remove_medication(db: State<AppDb>, id: String, archived_at: String) -> Result<Removal, String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;
    db::remove_medication(&conn, &id, &archived_at)
}

#[tauri::command]
pub fn save_schedule(db: State<AppDb>, schedule: ScheduleRow) -> Result<(), String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;
    db::upsert_schedule(&conn, &schedule)
}

#[tauri::command]
pub fn delete_schedule(db: State<AppDb>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;
    db::delete_schedule(&conn, &id)
}

#[tauri::command]
pub fn save_dose_log(db: State<AppDb>, dose_log: DoseLogRow) -> Result<(), String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;
    db::upsert_dose_log(&conn, &dose_log)
}

#[tauri::command]
pub fn save_snooze(db: State<AppDb>, snooze: SnoozeRow) -> Result<(), String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;
    db::upsert_snooze(&conn, &snooze)
}
