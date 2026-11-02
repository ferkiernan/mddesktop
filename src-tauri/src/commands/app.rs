use tauri::AppHandle;

/// Called by the frontend once every pending change was resolved; quits the app.
#[tauri::command]
pub fn confirm_exit(app: AppHandle) {
    app.exit(0);
}
