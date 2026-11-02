//! Native dialogs. Every path returned here is authorized in `AppState` (trusted origin).

use crate::error::AppResult;
use crate::state::AppState;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

pub fn pick_open_files(app: &AppHandle, state: &AppState) -> AppResult<Vec<PathBuf>> {
    let picked = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown"])
        .blocking_pick_files()
        .unwrap_or_default();
    let mut out = Vec::new();
    for fp in picked {
        if let Ok(p) = fp.into_path() {
            out.push(state.authorized.authorize(&p)?);
        }
    }
    Ok(out)
}

pub fn pick_save_path(
    app: &AppHandle,
    state: &AppState,
    suggested_name: &str,
    directory: Option<PathBuf>,
) -> AppResult<Option<PathBuf>> {
    let mut dlg = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md", "markdown"])
        .set_file_name(suggested_name);
    if let Some(d) = directory {
        dlg = dlg.set_directory(d);
    }
    let Some(fp) = dlg.blocking_save_file() else { return Ok(None) };
    let Ok(mut p) = fp.into_path() else { return Ok(None) };
    if p.extension().is_none() {
        p.set_extension("md");
    }
    Ok(Some(state.authorized.authorize(&p)?))
}
