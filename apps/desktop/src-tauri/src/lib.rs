mod tray;

use tauri::WindowEvent;
use tauri_plugin_autostart::ManagerExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::show_main(app);
        }))
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
        .setup(|app| {
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
