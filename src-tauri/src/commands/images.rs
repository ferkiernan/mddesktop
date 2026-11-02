use crate::error::AppResult;
use crate::services::images::{self, ImportResult};
use crate::state::AppState;
use std::path::PathBuf;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn pick_image(app: AppHandle, state: State<'_, AppState>) -> AppResult<Option<PathBuf>> {
    let picked = app
        .dialog()
        .file()
        .add_filter("Imágenes", &["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"])
        .blocking_pick_file();
    let Some(fp) = picked else { return Ok(None) };
    let Ok(p) = fp.into_path() else { return Ok(None) };
    Ok(Some(state.authorized.authorize_image(&p)?))
}

#[tauri::command]
pub async fn import_image(
    state: State<'_, AppState>,
    document_path: PathBuf,
    source_path: PathBuf,
    overwrite: Option<bool>,
) -> AppResult<ImportResult> {
    let doc = state.authorized.check(&document_path)?;
    let src = state.authorized.check_image(&source_path)?;
    images::import_image(&doc, &src, overwrite.unwrap_or(false))
}
