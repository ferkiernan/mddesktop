use crate::state::AppState;
use std::path::PathBuf;
use tauri::{AppHandle, State};

/// Called by the frontend once every pending change was resolved; quits the app.
#[tauri::command]
pub fn confirm_exit(app: AppHandle) {
    app.exit(0);
}

/// Files passed on the command line of the first launch (already authorized). Drains the list.
#[tauri::command]
pub fn get_launch_files(state: State<'_, AppState>) -> Vec<PathBuf> {
    std::mem::take(&mut *state.launch_files.lock().unwrap())
}
