use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MedicationRow {
    pub id: String,
    pub name: String,
    pub dosage: String,
    pub food_requirement: String,
    pub note: Option<String>,
    pub archived_at: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleRow {
    pub id: String,
    pub medication_id: String,
    pub hour: i32,
    pub minute: i32,
    pub days_of_week: Vec<i32>,
    pub grace_minutes: i32,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DoseLogRow {
    pub id: String,
    pub medication_id: String,
    pub schedule_id: Option<String>,
    pub scheduled_for: String,
    pub status: String,
    pub taken_at: Option<String>,
    pub with_food: Option<bool>,
    pub device: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SnoozeRow {
    pub schedule_id: String,
    pub scheduled_for: String,
    pub until: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Library {
    pub medications: Vec<MedicationRow>,
    pub schedules: Vec<ScheduleRow>,
    pub dose_logs: Vec<DoseLogRow>,
    pub snoozes: Vec<SnoozeRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Removal {
    pub deleted: bool,
    pub archived: bool,
}

pub fn open(path: &std::path::Path) -> Result<Connection, String> {
    let conn = Connection::open(path).map_err(|error| error.to_string())?;
    conn.execute_batch("pragma foreign_keys = on;")
        .map_err(|error| error.to_string())?;
    migrate(&conn)?;
    Ok(conn)
}

pub fn migrate(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(include_str!("schema.sql"))
        .map_err(|error| error.to_string())
}

pub fn load_library(conn: &Connection) -> Result<Library, String> {
    Ok(Library {
        medications: list_medications(conn)?,
        schedules: list_schedules(conn)?,
        dose_logs: list_dose_logs(conn)?,
        snoozes: list_snoozes(conn)?,
    })
}

pub fn upsert_medication(conn: &Connection, row: &MedicationRow) -> Result<(), String> {
    conn.execute(
        "insert into medications (id, name, dosage, food_requirement, note, archived_at, updated_at)
         values (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         on conflict(id) do update set
           name = excluded.name,
           dosage = excluded.dosage,
           food_requirement = excluded.food_requirement,
           note = excluded.note,
           archived_at = excluded.archived_at,
           updated_at = excluded.updated_at",
        params![
            row.id,
            row.name,
            row.dosage,
            row.food_requirement,
            row.note,
            row.archived_at,
            row.updated_at
        ],
    )
    .map(|_| ())
    .map_err(|error| error.to_string())
}

pub fn remove_medication(conn: &Connection, id: &str, archived_at: &str) -> Result<Removal, String> {
    let logs: i64 = conn
        .query_row(
            "select count(*) from dose_logs where medication_id = ?1",
            [id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    if logs > 0 {
        conn.execute(
            "update medications set archived_at = ?2, updated_at = ?2 where id = ?1",
            params![id, archived_at],
        )
        .map_err(|error| error.to_string())?;
        return Ok(Removal {
            deleted: false,
            archived: true,
        });
    }
    conn.execute("delete from schedules where medication_id = ?1", [id])
        .map_err(|error| error.to_string())?;
    conn.execute("delete from medications where id = ?1", [id])
        .map_err(|error| error.to_string())?;
    Ok(Removal {
        deleted: true,
        archived: false,
    })
}

pub fn upsert_schedule(conn: &Connection, row: &ScheduleRow) -> Result<(), String> {
    let days = serde_json::to_string(&row.days_of_week).map_err(|error| error.to_string())?;
    conn.execute(
        "insert into schedules (id, medication_id, hour, minute, days_of_week, grace_minutes, updated_at)
         values (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         on conflict(id) do update set
           medication_id = excluded.medication_id,
           hour = excluded.hour,
           minute = excluded.minute,
           days_of_week = excluded.days_of_week,
           grace_minutes = excluded.grace_minutes,
           updated_at = excluded.updated_at",
        params![
            row.id,
            row.medication_id,
            row.hour,
            row.minute,
            days,
            row.grace_minutes,
            row.updated_at
        ],
    )
    .map(|_| ())
    .map_err(|error| error.to_string())
}

pub fn delete_schedule(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("delete from schedules where id = ?1", [id])
        .map(|_| ())
        .map_err(|error| error.to_string())
}

pub fn upsert_dose_log(conn: &Connection, row: &DoseLogRow) -> Result<(), String> {
    conn.execute(
        "insert into dose_logs (
           id, medication_id, schedule_id, scheduled_for, status, taken_at, with_food, device, updated_at
         ) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         on conflict(id) do update set
           medication_id = excluded.medication_id,
           schedule_id = excluded.schedule_id,
           scheduled_for = excluded.scheduled_for,
           status = excluded.status,
           taken_at = excluded.taken_at,
           with_food = excluded.with_food,
           device = excluded.device,
           updated_at = excluded.updated_at",
        params![
            row.id,
            row.medication_id,
            row.schedule_id,
            row.scheduled_for,
            row.status,
            row.taken_at,
            row.with_food.map(|value| if value { 1 } else { 0 }),
            row.device,
            row.updated_at
        ],
    )
    .map(|_| ())
    .map_err(|error| error.to_string())
}

pub fn delete_dose_log(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("delete from dose_logs where id = ?1", [id])
        .map(|_| ())
        .map_err(|error| error.to_string())
}

pub fn upsert_snooze(conn: &Connection, row: &SnoozeRow) -> Result<(), String> {
    conn.execute(
        "insert into snoozes (schedule_id, scheduled_for, until) values (?1, ?2, ?3)
         on conflict(schedule_id, scheduled_for) do update set until = excluded.until",
        params![row.schedule_id, row.scheduled_for, row.until],
    )
    .map(|_| ())
    .map_err(|error| error.to_string())
}

fn list_medications(conn: &Connection) -> Result<Vec<MedicationRow>, String> {
    let mut statement = conn
        .prepare(
            "select id, name, dosage, food_requirement, note, archived_at, updated_at
             from medications order by name",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(MedicationRow {
                id: row.get(0)?,
                name: row.get(1)?,
                dosage: row.get(2)?,
                food_requirement: row.get(3)?,
                note: row.get(4)?,
                archived_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

fn list_schedules(conn: &Connection) -> Result<Vec<ScheduleRow>, String> {
    let mut statement = conn
        .prepare(
            "select id, medication_id, hour, minute, days_of_week, grace_minutes, updated_at
             from schedules order by hour, minute",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            let days: String = row.get(4)?;
            let days_of_week = serde_json::from_str(&days).map_err(|error| {
                rusqlite::Error::FromSqlConversionFailure(4, rusqlite::types::Type::Text, Box::new(error))
            })?;
            Ok(ScheduleRow {
                id: row.get(0)?,
                medication_id: row.get(1)?,
                hour: row.get(2)?,
                minute: row.get(3)?,
                days_of_week,
                grace_minutes: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

fn list_dose_logs(conn: &Connection) -> Result<Vec<DoseLogRow>, String> {
    let mut statement = conn
        .prepare(
            "select id, medication_id, schedule_id, scheduled_for, status, taken_at, with_food, device, updated_at
             from dose_logs order by scheduled_for",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            let with_food: Option<i64> = row.get(6)?;
            Ok(DoseLogRow {
                id: row.get(0)?,
                medication_id: row.get(1)?,
                schedule_id: row.get(2)?,
                scheduled_for: row.get(3)?,
                status: row.get(4)?,
                taken_at: row.get(5)?,
                with_food: with_food.map(|value| value != 0),
                device: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

fn list_snoozes(conn: &Connection) -> Result<Vec<SnoozeRow>, String> {
    let mut statement = conn
        .prepare("select schedule_id, scheduled_for, until from snoozes")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(SnoozeRow {
                schedule_id: row.get(0)?,
                scheduled_for: row.get(1)?,
                until: row.get(2)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn memory() -> Connection {
        let conn = Connection::open_in_memory().expect("memory db");
        conn.execute_batch("pragma foreign_keys = on;")
            .expect("foreign keys");
        migrate(&conn).expect("migrate");
        conn
    }

    fn medicine(name: &str) -> MedicationRow {
        MedicationRow {
            id: "m1".into(),
            name: name.into(),
            dosage: "10 mg".into(),
            food_requirement: "with_food".into(),
            note: None,
            archived_at: None,
            updated_at: "2026-10-29T12:00:00.000Z".into(),
        }
    }

    #[test]
    fn stores_a_medicine_and_reloads_it() {
        let conn = memory();
        upsert_medication(&conn, &medicine("Lisinopril")).unwrap();
        let library = load_library(&conn).unwrap();
        assert_eq!(library.medications[0].name, "Lisinopril");
    }

    #[test]
    fn deletes_a_medicine_with_no_history_and_archives_one_with_logs() {
        let conn = memory();
        upsert_medication(&conn, &medicine("Lisinopril")).unwrap();
        let removed = remove_medication(&conn, "m1", "2026-10-29T12:00:00.000Z").unwrap();
        assert!(removed.deleted);
        assert!(load_library(&conn).unwrap().medications.is_empty());

        upsert_medication(&conn, &medicine("Lisinopril")).unwrap();
        upsert_dose_log(
            &conn,
            &DoseLogRow {
                id: "log1".into(),
                medication_id: "m1".into(),
                schedule_id: None,
                scheduled_for: "2026-10-29T13:00:00.000Z".into(),
                status: "taken".into(),
                taken_at: Some("2026-10-29T13:05:00.000Z".into()),
                with_food: Some(true),
                device: Some("laptop".into()),
                updated_at: "2026-10-29T13:05:00.000Z".into(),
            },
        )
        .unwrap();
        let archived = remove_medication(&conn, "m1", "2026-10-29T14:00:00.000Z").unwrap();
        assert!(archived.archived);
        assert_eq!(
            load_library(&conn).unwrap().medications[0].archived_at.as_deref(),
            Some("2026-10-29T14:00:00.000Z")
        );
    }
}
