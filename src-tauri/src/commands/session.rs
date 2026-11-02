use crate::error::{AppError, AppResult, ErrorCode};
use crate::services::app_data::{AppData, Preferences, RecoveryEntry, Session};
use crate::state::AppState;
use tauri::{AppHandle, Manager, State};

pub(crate) fn data(app: &AppHandle) -> AppResult<AppData> {
    app.path()
        .app_data_dir()
        .map(AppData::new)
        .map_err(|e| AppError::new(ErrorCode::Io, e.to_string()))
}

/// Loads the previous session. Paths listed in our own session file are re-authorized here
/// (the frontend can never add authorized paths).
#[tauri::command]
pub async fn session_load(app: AppHandle, state: State<'_, AppState>) -> AppResult<Option<Session>> {
    let session = data(&app)?.load_session()?;
    if let Some(s) = &session {
        for t in &s.tabs {
            if let Some(p) = &t.file_path {
                let _ = state.authorized.authorize(p);
            }
        }
    }
    Ok(session)
}

#[tauri::command]
pub async fn session_save(app: AppHandle, state: State<'_, AppState>, session: Session) -> AppResult<()> {
    for t in &session.tabs {
        if let Some(p) = &t.file_path {
            state.authorized.check(p)?;
        }
    }
    data(&app)?.save_session(&session)
}

#[tauri::command]
pub async fn recovery_write(app: AppHandle, entry: RecoveryEntry) -> AppResult<()> {
    data(&app)?.recovery_write(&entry)
}

#[tauri::command]
pub async fn recovery_list(app: AppHandle, state: State<'_, AppState>) -> AppResult<Vec<RecoveryEntry>> {
    let list = data(&app)?.recovery_list()?;
    for e in &list {
        if let Some(p) = &e.file_path {
            let _ = state.authorized.authorize(p);
        }
    }
    Ok(list)
}

#[tauri::command]
pub async fn recovery_delete(app: AppHandle, document_id: String) -> AppResult<()> {
    data(&app)?.recovery_delete(&document_id)
}

#[tauri::command]
pub async fn settings_load(app: AppHandle) -> AppResult<Preferences> {
    data(&app)?.load_settings()
}

#[tauri::command]
pub async fn settings_save(app: AppHandle, patch: serde_json::Value) -> AppResult<Preferences> {
    data(&app)?.save_settings(&patch)
}
