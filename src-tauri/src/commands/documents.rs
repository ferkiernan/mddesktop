use crate::error::{AppError, AppResult, ErrorCode};
use crate::services::dialog_service;
use crate::services::fs_service::{self, FileFingerprint, ReadResult, WriteRequest};
use crate::state::AppState;
use serde::Serialize;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager, State};

#[tauri::command]
pub async fn pick_open_files(app: AppHandle, state: State<'_, AppState>) -> AppResult<Vec<PathBuf>> {
    dialog_service::pick_open_files(&app, &state)
}

#[tauri::command]
pub async fn read_document(
    app: AppHandle,
    state: State<'_, AppState>,
    path: PathBuf,
    accept_large: bool,
) -> AppResult<ReadResult> {
    let path = state.authorized.check(&path)?;
    // FR-002a: threshold comes from the preferences (default 256 KB, see docs/performance.md)
    let warn = super::session::data(&app)?.load_settings()?.large_file_warn_bytes;
    let r = fs_service::read_document(&path, accept_large, warn)?;
    state.known.set(&path, r.fingerprint.clone());
    allow_assets(&app, &path);
    Ok(r)
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
    app: AppHandle,
    state: State<'_, AppState>,
    mut request: WriteRequest,
) -> AppResult<WriteResult> {
    request.path = state.authorized.check(&request.path)?;
    let fingerprint = fs_service::write_document(&request)?;
    state.known.set(&request.path, fingerprint.clone());
    allow_assets(&app, &request.path);
    Ok(WriteResult { fingerprint })
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

/// Replaces the set of watched documents; changes arrive as `fs://external-change`.
#[tauri::command]
pub async fn watch_documents(
    app: AppHandle,
    state: State<'_, AppState>,
    paths: Vec<PathBuf>,
) -> AppResult<()> {
    let mut checked = Vec::new();
    for p in &paths {
        checked.push(state.authorized.check(p)?);
    }
    state
        .watcher
        .set_paths(&checked, state.known.clone(), move |change| {
            let _ = app.emit("fs://external-change", change);
        })
        .map_err(|e| AppError::new(ErrorCode::Io, e.to_string()))
}

/// Lets the webview display images stored next to an authorized document (asset: protocol).
fn allow_assets(app: &AppHandle, document: &std::path::Path) {
    if let Some(dir) = document.parent() {
        let _ = app.asset_protocol_scope().allow_directory(dir, true);
    }
}
