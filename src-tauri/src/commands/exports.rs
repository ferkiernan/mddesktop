//! Export to a file chosen by the user (feature 002): the dialog authorizes the path, the write
//! only accepts authorized paths with an output extension, atomically.

use crate::error::{AppError, AppResult, ErrorCode};
use crate::services::authz::{export_extension, AuthorizedPaths};
use crate::services::fs_service::atomic_write;
use crate::state::AppState;
use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

/// Largest export we accept (decoded).
pub const MAX_EXPORT_BYTES: usize = 256 * 1024 * 1024;

/// A file-name stem that is safe to suggest: no separators or reserved characters.
pub fn safe_stem(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| {
            if matches!(c, '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|') || c.is_control() {
                '_'
            } else {
                c
            }
        })
        .collect();
    let trimmed = cleaned.trim().trim_matches('.').to_string();
    if trimmed.is_empty() {
        "Documento".into()
    } else {
        trimmed
    }
}

#[derive(Serialize)]
pub struct WriteExportResult {
    pub bytes: usize,
}

/// Decodes and writes the payload to an authorized export path.
pub fn write_export_bytes(authz: &AuthorizedPaths, path: &Path, data_base64: &str) -> AppResult<usize> {
    let canon = authz.check_export(path)?;
    if data_base64.len() > MAX_EXPORT_BYTES / 3 * 4 + 8 {
        return Err(AppError::new(ErrorCode::InvalidArgument, "export is too large"));
    }
    let bytes = STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|_| AppError::new(ErrorCode::InvalidArgument, "payload is not valid base64"))?;
    if bytes.len() > MAX_EXPORT_BYTES {
        return Err(AppError::new(ErrorCode::InvalidArgument, "export is too large"));
    }
    atomic_write(&canon, &bytes)?;
    authz.revoke_export(&canon);
    Ok(bytes.len())
}

#[tauri::command]
pub async fn pick_export_path(
    app: AppHandle,
    state: State<'_, AppState>,
    format: String,
    suggested_name: String,
    directory: Option<PathBuf>,
) -> AppResult<Option<PathBuf>> {
    let ext = export_extension(&format)
        .ok_or_else(|| AppError::new(ErrorCode::InvalidArgument, "unknown export format"))?;
    let label = match ext {
        "html" => "Página web",
        "pdf" => "PDF",
        "docx" => "Word",
        _ => "OpenDocument",
    };
    let mut dlg = app
        .dialog()
        .file()
        .add_filter(label, &[ext])
        .set_file_name(format!("{}.{ext}", safe_stem(&suggested_name)));
    if let Some(d) = directory {
        dlg = dlg.set_directory(d);
    }
    let Some(fp) = dlg.blocking_save_file() else { return Ok(None) };
    let Ok(mut p) = fp.into_path() else { return Ok(None) };
    let has_ext = p
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case(ext))
        .unwrap_or(false);
    if !has_ext {
        let mut name = p.file_name().map(|n| n.to_os_string()).unwrap_or_default();
        name.push(format!(".{ext}"));
        p.set_file_name(name);
    }
    Ok(Some(state.authorized.authorize_export(&p)?))
}

#[tauri::command]
pub async fn write_export(
    state: State<'_, AppState>,
    path: PathBuf,
    data_base64: String,
) -> AppResult<WriteExportResult> {
    Ok(WriteExportResult { bytes: write_export_bytes(&state.authorized, &path, &data_base64)? })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn safe_stem_strips_path_and_reserved_characters() {
        assert_eq!(safe_stem("a/b\\c:d*e?"), "a_b_c_d_e_");
        assert_eq!(safe_stem("  ..  "), "Documento");
        assert_eq!(safe_stem(""), "Documento");
        assert_eq!(safe_stem("Mi nota"), "Mi nota");
    }

    #[test]
    fn writes_only_to_authorized_export_paths_and_consumes_the_authorization() {
        let dir = tempfile::tempdir().unwrap();
        let out = dir.path().join("salida.pdf");
        let state = AuthorizedPaths::default();
        let data = STANDARD.encode(b"%PDF-1.4 test");

        assert_eq!(write_export_bytes(&state, &out, &data).unwrap_err().code, ErrorCode::NotAuthorized);
        assert!(!out.exists());

        state.authorize_export(&out).unwrap();
        assert_eq!(write_export_bytes(&state, &out, &data).unwrap(), 13);
        assert_eq!(std::fs::read(&out).unwrap(), b"%PDF-1.4 test");

        // the authorization was consumed: a second write needs a new dialog
        assert_eq!(write_export_bytes(&state, &out, &data).unwrap_err().code, ErrorCode::NotAuthorized);
    }

    #[test]
    fn rejects_bad_extensions_and_bad_base64_but_keeps_the_authorization() {
        let dir = tempfile::tempdir().unwrap();
        let state = AuthorizedPaths::default();
        for bad in ["x.exe", "x.md", "x.bat"] {
            assert_eq!(
                state.authorize_export(&dir.path().join(bad)).unwrap_err().code,
                ErrorCode::InvalidArgument
            );
        }
        let out = dir.path().join("ok.html");
        state.authorize_export(&out).unwrap();
        assert_eq!(
            write_export_bytes(&state, &out, "%%%not base64%%%").unwrap_err().code,
            ErrorCode::InvalidArgument
        );
        assert!(!out.exists());
        assert!(write_export_bytes(&state, &out, &STANDARD.encode(b"<html></html>")).is_ok());
    }

    #[test]
    fn unknown_parent_directory_is_rejected_without_creating_anything() {
        let dir = tempfile::tempdir().unwrap();
        let state = AuthorizedPaths::default();
        let out = dir.path().join("sub").join("x.docx");
        assert!(state.authorize_export(&out).is_err());
        assert!(!out.exists());
    }
}
