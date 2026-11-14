pub mod commands;
pub mod error;
pub mod services;
pub mod state;

use std::path::Path;
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // single-instance must be registered first
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
            let (files, rejected) = services::lifecycle::partition_args(&args[1.min(args.len())..], Path::new(&cwd));
            services::lifecycle::dispatch_open(app, files.into_iter().chain(rejected).collect(), "second-instance");
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(state::AppState::default())
        .setup(|app| {
            services::menu::setup(app)?;
            services::lifecycle::collect_launch_files(app.handle());
            Ok(())
        })
        .on_window_event(|window, event| match event {
            // the frontend resolves unsaved changes, then calls confirm_exit
            tauri::WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.emit("app://close-requested", serde_json::json!({}));
            }
            tauri::WindowEvent::DragDrop(tauri::DragDropEvent::Drop { paths, .. }) => {
                services::lifecycle::dispatch_open(window.app_handle(), paths.clone(), "drop");
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            commands::documents::pick_open_files,
            commands::documents::read_document,
            commands::documents::pick_save_path,
            commands::documents::write_document,
            commands::documents::stat_document,
            commands::documents::watch_documents,
            commands::app::confirm_exit,
            commands::app::get_launch_files,
            commands::app::set_style_menu,
            commands::app::set_view_menu,
            commands::session::session_load,
            commands::session::session_save,
            commands::session::recovery_write,
            commands::session::recovery_list,
            commands::session::recovery_delete,
            commands::session::settings_load,
            commands::session::settings_save,
            commands::images::pick_image,
            commands::images::import_image,
            commands::exports::pick_export_path,
            commands::exports::write_export,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
