//! settings.json, session.json and recovery/ (see contracts/storage-formats.md).

use super::fs_service::{atomic_write, FileFingerprint};
use super::persistence::{read_json, write_json};
use crate::error::{AppError, AppResult, ErrorCode};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default)] // files written by older versions lack new fields
pub struct Preferences {
    pub version: u32,
    pub theme: String,
    pub ui_zoom: f64,
    pub status_bar_visible: bool,
    pub last_directory: Option<String>,
    pub editor_pool_size: u32,
    pub large_file_warn_bytes: u64,
    /// Editor style preset id (see src/features/settings/editorStyles.ts); unknown ids fall back in the UI.
    pub editor_style: String,
    /// mdwysiwyg `showToolbar` (View menu). On by default.
    pub editor_toolbar_visible: bool,
    /// mdwysiwyg `historyUndo` (Settings menu). On by default (spec 003, owner's decision).
    pub editor_history: bool,
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            version: 1,
            theme: "light".into(),
            ui_zoom: 1.0,
            status_bar_visible: true,
            last_directory: None,
            editor_pool_size: 3,
            large_file_warn_bytes: 256 * 1024,
            editor_style: "default".into(),
            editor_toolbar_visible: true,
            editor_history: true,
        }
    }
}

impl Preferences {
    fn sanitized(mut self) -> Self {
        self.version = 1;
        if self.theme != "dark" {
            self.theme = "light".into();
        }
        self.ui_zoom = if self.ui_zoom.is_finite() { self.ui_zoom.clamp(0.7, 2.0) } else { 1.0 };
        self.editor_pool_size = self.editor_pool_size.clamp(1, 8);
        let ok = !self.editor_style.is_empty()
            && self.editor_style.len() <= 32
            && self.editor_style.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-');
        if !ok {
            self.editor_style = "default".into();
        }
        if self.large_file_warn_bytes == 0 {
            self.large_file_warn_bytes = Preferences::default().large_file_warn_bytes;
        }
        self
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SessionTab {
    pub document_id: String,
    pub file_path: Option<PathBuf>,
    pub fingerprint: Option<FileFingerprint>,
    pub has_recovery: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub version: u32,
    pub saved_at: u64,
    pub active_document_id: Option<String>,
    pub tabs: Vec<SessionTab>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryEntry {
    pub document_id: String,
    pub file_path: Option<PathBuf>,
    pub base_fingerprint: Option<FileFingerprint>,
    pub eol: super::encoding::Eol,
    pub encoding: String,
    pub bom: bool,
    pub written_at: u64,
    #[serde(default)]
    pub content: String,
}

pub struct AppData {
    dir: PathBuf,
}

/// Document ids become file names: allow only a conservative alphabet (no path traversal).
fn valid_id(id: &str) -> AppResult<()> {
    if !id.is_empty() && id.len() <= 64 && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        Ok(())
    } else {
        Err(AppError::new(ErrorCode::InvalidArgument, "invalid document id"))
    }
}

impl AppData {
    pub fn new(dir: impl Into<PathBuf>) -> Self {
        Self { dir: dir.into() }
    }

    fn settings_path(&self) -> PathBuf {
        self.dir.join("settings.json")
    }
    fn session_path(&self) -> PathBuf {
        self.dir.join("session.json")
    }
    fn recovery_dir(&self) -> PathBuf {
        self.dir.join("recovery")
    }

    pub fn load_settings(&self) -> AppResult<Preferences> {
        Ok(read_json::<Preferences>(&self.settings_path())?.unwrap_or_default().sanitized())
    }

    /// Merges known keys of `patch` into the stored preferences, clamps, and persists.
    pub fn save_settings(&self, patch: &serde_json::Value) -> AppResult<Preferences> {
        let mut current = serde_json::to_value(self.load_settings()?).expect("serializable");
        if let (Some(cur), Some(p)) = (current.as_object_mut(), patch.as_object()) {
            for (k, v) in p {
                if cur.contains_key(k) && k != "version" {
                    cur.insert(k.clone(), v.clone());
                }
            }
        }
        let prefs: Preferences = serde_json::from_value(current)
            .map_err(|e| AppError::new(ErrorCode::InvalidArgument, e.to_string()))?;
        let prefs = prefs.sanitized();
        write_json(&self.settings_path(), &prefs)?;
        Ok(prefs)
    }

    pub fn load_session(&self) -> AppResult<Option<Session>> {
        read_json(&self.session_path())
    }

    pub fn save_session(&self, session: &Session) -> AppResult<()> {
        for t in &session.tabs {
            valid_id(&t.document_id)?;
        }
        write_json(&self.session_path(), session)
    }

    pub fn recovery_write(&self, entry: &RecoveryEntry) -> AppResult<()> {
        valid_id(&entry.document_id)?;
        let dir = self.recovery_dir();
        std::fs::create_dir_all(&dir)?;
        atomic_write(&dir.join(format!("{}.md", entry.document_id)), entry.content.as_bytes())?;
        let meta = RecoveryEntry { content: String::new(), ..entry.clone() };
        write_json(&dir.join(format!("{}.json", entry.document_id)), &meta)
    }

    pub fn recovery_list(&self) -> AppResult<Vec<RecoveryEntry>> {
        let dir = self.recovery_dir();
        let Ok(rd) = std::fs::read_dir(&dir) else { return Ok(Vec::new()) };
        let mut out = Vec::new();
        for e in rd.flatten() {
            let p = e.path();
            if p.extension().and_then(|x| x.to_str()) != Some("json") {
                continue;
            }
            let Some(mut entry) = read_json::<RecoveryEntry>(&p)? else { continue };
            if valid_id(&entry.document_id).is_err() {
                continue;
            }
            entry.content = std::fs::read_to_string(p.with_extension("md")).unwrap_or_default();
            out.push(entry);
        }
        out.sort_by_key(|e| e.written_at);
        Ok(out)
    }

    pub fn recovery_delete(&self, document_id: &str) -> AppResult<()> {
        valid_id(document_id)?;
        for ext in ["md", "json"] {
            let _ = std::fs::remove_file(self.recovery_dir().join(format!("{document_id}.{ext}")));
        }
        Ok(())
    }

    pub fn dir(&self) -> &Path {
        &self.dir
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::encoding::Eol;

    fn entry(id: &str, content: &str) -> RecoveryEntry {
        RecoveryEntry {
            document_id: id.into(),
            file_path: None,
            base_fingerprint: None,
            eol: Eol::Lf,
            encoding: "utf-8".into(),
            bom: false,
            written_at: 1,
            content: content.into(),
        }
    }

    #[test]
    fn settings_default_merge_and_clamp() {
        let d = tempfile::tempdir().unwrap();
        let a = AppData::new(d.path());
        assert_eq!(a.load_settings().unwrap(), Preferences::default());
        let p = a
            .save_settings(&serde_json::json!({ "theme": "dark", "uiZoom": 9.0, "editorPoolSize": 0, "bogus": 1 }))
            .unwrap();
        assert_eq!((p.theme.as_str(), p.ui_zoom, p.editor_pool_size), ("dark", 2.0, 1));
        assert_eq!(a.load_settings().unwrap(), p);
    }

    #[test]
    fn editor_style_is_validated_and_old_files_get_a_default() {
        let d = tempfile::tempdir().unwrap();
        let a = AppData::new(d.path());
        // a settings.json written before the field existed still loads (not treated as corrupt)
        std::fs::write(d.path().join("settings.json"), r#"{"version":1,"theme":"dark"}"#).unwrap();
        let p = a.load_settings().unwrap();
        assert_eq!((p.theme.as_str(), p.editor_style.as_str()), ("dark", "default"));
        assert!(!std::fs::read_dir(d.path()).unwrap().any(|e| e.unwrap().file_name().to_string_lossy().contains("corrupt")));
        assert_eq!(a.save_settings(&serde_json::json!({ "editorStyle": "winamp" })).unwrap().editor_style, "winamp");
        assert_eq!(a.save_settings(&serde_json::json!({ "editorStyle": "../x; evil" })).unwrap().editor_style, "default");
    }

    #[test]
    fn editor_toolbar_and_history_default_on_and_old_files_get_them() {
        let d = tempfile::tempdir().unwrap();
        let a = AppData::new(d.path());
        let p = a.load_settings().unwrap();
        assert!(p.editor_toolbar_visible && p.editor_history); // spec 003: both on by default
        std::fs::write(d.path().join("settings.json"), r#"{"version":1,"theme":"dark"}"#).unwrap();
        let p = a.load_settings().unwrap();
        assert!(p.editor_toolbar_visible && p.editor_history);
        let p = a.save_settings(&serde_json::json!({ "editorToolbarVisible": false, "editorHistory": false })).unwrap();
        assert!(!p.editor_toolbar_visible && !p.editor_history);
        assert_eq!(a.load_settings().unwrap(), p);
        // wrong types are rejected without touching the stored values
        assert!(a.save_settings(&serde_json::json!({ "editorHistory": "yes" })).is_err());
        assert!(!a.load_settings().unwrap().editor_history);
    }

    #[test]
    fn corrupt_settings_fall_back_to_defaults() {
        let d = tempfile::tempdir().unwrap();
        std::fs::write(d.path().join("settings.json"), "{ nope").unwrap();
        assert_eq!(AppData::new(d.path()).load_settings().unwrap(), Preferences::default());
    }

    #[test]
    fn session_roundtrip_and_id_validation() {
        let d = tempfile::tempdir().unwrap();
        let a = AppData::new(d.path());
        assert!(a.load_session().unwrap().is_none());
        let s = Session {
            version: 1,
            saved_at: 5,
            active_document_id: Some("abc-1".into()),
            tabs: vec![SessionTab { document_id: "abc-1".into(), file_path: None, fingerprint: None, has_recovery: true }],
        };
        a.save_session(&s).unwrap();
        assert_eq!(a.load_session().unwrap(), Some(s.clone()));
        let mut bad = s;
        bad.tabs[0].document_id = "../evil".into();
        assert_eq!(a.save_session(&bad).unwrap_err().code, ErrorCode::InvalidArgument);
    }

    #[test]
    fn recovery_write_list_delete() {
        let d = tempfile::tempdir().unwrap();
        let a = AppData::new(d.path());
        a.recovery_write(&entry("doc-1", "# sin guardar\n")).unwrap();
        a.recovery_write(&entry("doc-2", "otro")).unwrap();
        let list = a.recovery_list().unwrap();
        assert_eq!(list.len(), 2);
        assert!(list.iter().any(|e| e.document_id == "doc-1" && e.content == "# sin guardar\n"));
        a.recovery_delete("doc-1").unwrap();
        assert_eq!(a.recovery_list().unwrap().len(), 1);
        assert_eq!(a.recovery_write(&entry("../x", "")).unwrap_err().code, ErrorCode::InvalidArgument);
    }
}
