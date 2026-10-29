mod commands;
mod db;
mod due;
mod scheduler;
mod tray;

use std::sync::Mutex;

use tauri::{Manager, WindowEvent};
use tauri_plugin_autostart::ManagerExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::show_main(app);
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_library,
            commands::save_medication,
            commands::remove_medication,
            commands::save_schedule,
            commands::delete_schedule,
            commands::save_dose_log,
            commands::save_snooze,
        ])
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let connection = db::open(&dir.join("open-medication.sqlite"))?;
            let wake = scheduler::wake();
            scheduler::spawn(app.handle().clone(), wake.clone());
            app.manage(commands::AppDb {
                connection: Mutex::new(connection),
                wake,
            });
            tray::install_tray(app.handle())?;
            let _ = app.autolaunch().enable();
            if !std::env::args().any(|arg| arg == "--hidden") {
                tray::show_main(app.handle());
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Open Medication failed to start");
}
