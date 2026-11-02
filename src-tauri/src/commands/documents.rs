use crate::error::AppResult;
use crate::services::fs_service::{self, FileFingerprint, ReadResult, WriteRequest};
use crate::services::dialog_service;
use crate::state::AppState;
use serde::Serialize;
use std::path::PathBuf;
use tauri::{AppHandle, State};

/// Default large-file threshold (FR-002a); becomes a preference in the settings story.
const LARGE_FILE_WARN_BYTES: u64 = 5 * 1024 * 1024;

#[tauri::command]
pub async fn pick_open_files(app: AppHandle, state: State<'_, AppState>) -> AppResult<Vec<PathBuf>> {
    dialog_service::pick_open_files(&app, &state)
}

#[tauri::command]
pub async fn read_document(
    state: State<'_, AppState>,
    path: PathBuf,
    accept_large: bool,
) -> AppResult<ReadResult> {
    let path = state.authorized.check(&path)?;
    fs_service::read_document(&path, accept_large, LARGE_FILE_WARN_BYTES)
}

#[tauri::command]
pub async fn pick_save_path(
    app: AppHandle,
    state: State<'_, AppState>,
    suggested_name: String,
    directory: Option<PathBuf>,
) -> AppResult<Option<PathBuf>> {
    dialog_service::pick_save_path(&app, &state, &suggested_name, directory)
}

#[derive(Serialize)]
pub struct WriteResult {
    pub fingerprint: FileFingerprint,
}

#[tauri::command]
pub async fn write_document(
    state: State<'_, AppState>,
    mut request: WriteRequest,
) -> AppResult<WriteResult> {
    request.path = state.authorized.check(&request.path)?;
    Ok(WriteResult { fingerprint: fs_service::write_document(&request)? })
}

#[derive(Serialize)]
pub struct StatResult {
    pub exists: bool,
    pub fingerprint: Option<FileFingerprint>,
}

#[tauri::command]
pub async fn stat_document(state: State<'_, AppState>, path: PathBuf) -> AppResult<StatResult> {
    let path = state.authorized.check(&path)?;
    if fs_service::stat(&path)?.is_none() {
        return Ok(StatResult { exists: false, fingerprint: None });
    }
    let bytes = std::fs::read(&path)?;
    let fingerprint = fs_service::fingerprint_of_bytes(&path, &bytes)?;
    Ok(StatResult { exists: true, fingerprint: Some(fingerprint) })
}
