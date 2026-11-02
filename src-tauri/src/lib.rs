pub mod commands;
pub mod error;
pub mod services;
pub mod state;

use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // single-instance must be registered first
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(state::AppState::default())
        .setup(|app| {
            services::menu::setup(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // the frontend resolves unsaved changes, then calls confirm_exit
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.emit("app://close-requested", serde_json::json!({}));
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::documents::pick_open_files,
            commands::documents::read_document,
            commands::documents::pick_save_path,
            commands::documents::write_document,
            commands::documents::stat_document,
            commands::documents::watch_documents,
            commands::app::confirm_exit,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
