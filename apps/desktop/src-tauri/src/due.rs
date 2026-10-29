use chrono::{DateTime, Datelike, Duration, Local, TimeZone};

use crate::db::{DoseLogRow, Library, ScheduleRow, SnoozeRow};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DueDose {
    pub schedule_id: String,
    pub medication_name: String,
    pub dosage: String,
    pub food_text: String,
    pub scheduled_for: DateTime<Local>,
    pub fire_at: DateTime<Local>,
}

pub fn next_due(library: &Library, now: DateTime<Local>) -> Option<DueDose> {
    let mut best: Option<DueDose> = None;
    for schedule in &library.schedules {
        let Some(medication) = library
            .medications
            .iter()
            .find(|medication| medication.id == schedule.medication_id && medication.archived_at.is_none())
        else {
            continue;
        };
        if !valid_schedule(schedule) {
            continue;
        }
        let lookback = (schedule.grace_minutes + (60 * 24) - 1) / (60 * 24) + 1;
        for offset in -lookback..=8 {
            let Some(day) = now.date_naive().checked_add_signed(Duration::days(offset as i64)) else {
                continue;
            };
            let weekday = day.weekday().num_days_from_sunday() as i32;
            if !schedule.days_of_week.contains(&weekday) {
                continue;
            }
            let Some(scheduled_for) = Local
                .with_ymd_and_hms(day.year(), day.month(), day.day(), schedule.hour as u32, schedule.minute as u32, 0)
                .single()
            else {
                continue;
            };
            let grace_ends = scheduled_for + Duration::minutes(schedule.grace_minutes as i64);
            let snooze_until = snooze_until(&library.snoozes, &schedule.id, scheduled_for);
            let snooze_pending = snooze_until.is_some_and(|until| now < until);
            if now >= grace_ends && !snooze_pending {
                continue;
            }
            if logged(&library.dose_logs, &schedule.id, scheduled_for) {
                continue;
            }
            let mut fire_at = if scheduled_for > now { scheduled_for } else { now };
            if let Some(until) = snooze_until {
                if until > fire_at {
                    fire_at = until;
                }
            }
            let due = DueDose {
                schedule_id: schedule.id.clone(),
                medication_name: medication.name.clone(),
                dosage: medication.dosage.clone(),
                food_text: food_text(&medication.food_requirement).to_string(),
                scheduled_for,
                fire_at,
            };
            if best.as_ref().is_none_or(|current| {
                due.fire_at < current.fire_at
                    || (due.fire_at == current.fire_at && due.scheduled_for < current.scheduled_for)
            }) {
                best = Some(due);
            }
        }
    }
    best
}

fn valid_schedule(schedule: &ScheduleRow) -> bool {
    (0..24).contains(&schedule.hour)
        && (0..60).contains(&schedule.minute)
        && (1..=24 * 60).contains(&schedule.grace_minutes)
        && !schedule.days_of_week.is_empty()
        && schedule.days_of_week.iter().all(|day| (0..=6).contains(day))
}

fn logged(logs: &[DoseLogRow], schedule_id: &str, scheduled_for: DateTime<Local>) -> bool {
    logs.iter().any(|log| {
        log.schedule_id.as_deref() == Some(schedule_id)
            && same_minute(&log.scheduled_for, scheduled_for)
    })
}

fn snooze_until(snoozes: &[SnoozeRow], schedule_id: &str, scheduled_for: DateTime<Local>) -> Option<DateTime<Local>> {
    snoozes.iter().find_map(|snooze| {
        if snooze.schedule_id != schedule_id || !same_minute(&snooze.scheduled_for, scheduled_for) {
            return None;
        }
        parse_local(&snooze.until)
    })
}

fn same_minute(stored: &str, scheduled_for: DateTime<Local>) -> bool {
    parse_local(stored).is_some_and(|parsed| parsed.timestamp() == scheduled_for.timestamp())
}

fn parse_local(value: &str) -> Option<DateTime<Local>> {
    DateTime::parse_from_rfc3339(value)
        .ok()
        .map(|parsed| parsed.with_timezone(&Local))
}

fn food_text(requirement: &str) -> &'static str {
    match requirement {
        "with_food" => "Take with food",
        "empty_stomach" => "Take without food",
        _ => "With or without food",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{Library, MedicationRow};

    fn library(hour: i32) -> Library {
        Library {
            medications: vec![MedicationRow {
                id: "m1".into(),
                name: "Lisinopril".into(),
                dosage: "10 mg".into(),
                food_requirement: "with_food".into(),
                note: None,
                archived_at: None,
                updated_at: "2026-10-29T00:00:00Z".into(),
            }],
            schedules: vec![ScheduleRow {
                id: "s1".into(),
                medication_id: "m1".into(),
                hour,
                minute: 0,
                days_of_week: vec![0, 1, 2, 3, 4, 5, 6],
                grace_minutes: 60,
                updated_at: "2026-10-29T00:00:00Z".into(),
            }],
            dose_logs: vec![],
            snoozes: vec![],
        }
    }

    #[test]
    fn fires_at_the_scheduled_time_when_the_dose_is_still_ahead() {
        let now = Local.with_ymd_and_hms(2026, 10, 29, 8, 0, 0).single().unwrap();
        let due = next_due(&library(9), now).unwrap();
        assert_eq!(due.fire_at, Local.with_ymd_and_hms(2026, 10, 29, 9, 0, 0).single().unwrap());
        assert_eq!(due.food_text, "Take with food");
    }

    #[test]
    fn fires_immediately_inside_the_grace_window() {
        let now = Local.with_ymd_and_hms(2026, 10, 29, 9, 20, 0).single().unwrap();
        let due = next_due(&library(9), now).unwrap();
        assert_eq!(due.fire_at, now);
    }
}
