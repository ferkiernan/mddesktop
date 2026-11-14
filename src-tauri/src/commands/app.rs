use crate::error::{AppError, AppResult, ErrorCode};
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
    for (id, item) in state.style_items.lock().unwrap().iter().chain(state.custom_style_items.lock().unwrap().iter()) {
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

/// Replaces the user's own styles at the end of Configuración > Estilo del editor (spec 004).
#[tauri::command]
pub fn set_custom_styles_menu(app: AppHandle, state: State<'_, AppState>, items: Vec<(String, String)>, active: String) -> AppResult<()> {
    use tauri::menu::{CheckMenuItemBuilder, PredefinedMenuItem};
    let menu = state.style_menu.lock().unwrap().clone();
    let Some(menu) = menu else { return Ok(()) };
    let err = |e: tauri::Error| AppError::new(ErrorCode::Io, e.to_string());
    for (_, old) in state.custom_style_items.lock().unwrap().drain(..) {
        let _ = menu.remove(&old);
    }
    if let Some(sep) = state.custom_style_separator.lock().unwrap().take() {
        let _ = menu.remove(&sep);
    }
    if items.len() > crate::services::custom_styles::MAX_STYLES {
        return Err(AppError::new(ErrorCode::InvalidArgument, "demasiados estilos"));
    }
    if !items.is_empty() {
        let sep = PredefinedMenuItem::separator(&app).map_err(err)?;
        menu.append(&sep).map_err(err)?;
        *state.custom_style_separator.lock().unwrap() = Some(sep);
    }
    let mut list = state.custom_style_items.lock().unwrap();
    for (id, label) in items {
        let ok = id.starts_with("custom-") && id.len() <= 32 && id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-');
        let label: String = label.chars().filter(|c| !c.is_control()).take(40).collect();
        if !ok || label.trim().is_empty() {
            return Err(AppError::new(ErrorCode::InvalidArgument, "estilo de menú no válido"));
        }
        let check = CheckMenuItemBuilder::with_id(format!("style.{id}"), label).checked(id == active).build(&app).map_err(err)?;
        menu.append(&check).map_err(err)?;
        list.push((id, check));
    }
    Ok(())
}

/// Files passed on the command line of the first launch (already authorized). Drains the list.
#[tauri::command]
pub fn get_launch_files(state: State<'_, AppState>) -> Vec<PathBuf> {
    std::mem::take(&mut *state.launch_files.lock().unwrap())
}
