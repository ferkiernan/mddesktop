use crate::state::AppState;
use std::path::PathBuf;
use tauri::{AppHandle, State};

/// Called by the frontend once every pending change was resolved; quits the app.
#[tauri::command]
pub fn confirm_exit(app: AppHandle) {
    app.exit(0);
}

/// Marks the active editor style in the native Configuración menu (exactly one item is checked).
#[tauri::command]
pub fn set_style_menu(state: State<'_, AppState>, style: String) {
    for (id, item) in state.style_items.lock().unwrap().iter() {
        let _ = item.set_checked(*id == style);
    }
}

/// Syncs the "Mostrar barra de herramientas" / "Historial de versiones" check marks with the preferences.
#[tauri::command]
pub fn set_view_menu(state: State<'_, AppState>, toolbar: bool, history: bool) {
    if let Some((t, h)) = state.view_items.lock().unwrap().as_ref() {
        let _ = t.set_checked(toolbar);
        let _ = h.set_checked(history);
    }
}

/// Files passed on the command line of the first launch (already authorized). Drains the list.
#[tauri::command]
pub fn get_launch_files(state: State<'_, AppState>) -> Vec<PathBuf> {
    std::mem::take(&mut *state.launch_files.lock().unwrap())
}
