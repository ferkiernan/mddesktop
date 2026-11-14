//! User-defined editor styles (spec 004): `styles.json` in the app data folder, written atomically.
//! Values are validated so a style can only carry colours, gradients, font lists and plain numbers:
//! they are injected into a stylesheet, so nothing that could escape a declaration is accepted.

use super::persistence::{read_json, write_json};
use crate::error::{AppError, AppResult, ErrorCode};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

pub const MAX_STYLES: usize = 200;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CustomStyle {
    pub id: String,
    pub label: String,
    /// Basic colours the rest is derived from (bg, fg, accent, border, bar).
    #[serde(default)]
    pub base: BTreeMap<String, String>,
    /// Variables set explicitly (advanced mode); everything else is derived from `base`.
    #[serde(default)]
    pub overrides: BTreeMap<String, String>,
    #[serde(default)]
    pub created_at: u64,
    #[serde(default)]
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct StylesFile {
    pub version: u32,
    pub styles: Vec<CustomStyle>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LoadedStyles {
    pub styles: Vec<CustomStyle>,
    /// True when the file was unreadable and was set aside (`styles.json.corrupt-<ts>`).
    pub recovered: bool,
}

fn valid_id(id: &str) -> bool {
    id.len() > 7
        && id.len() <= 32
        && id.starts_with("custom-")
        && id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

fn valid_label(label: &str) -> bool {
    let t = label.trim();
    !t.is_empty() && t.chars().count() <= 40 && !t.chars().any(char::is_control)
}

fn valid_var_name(name: &str) -> bool {
    (name.starts_with("--mdw-") || name.starts_with("--mdd-"))
        && name.len() <= 48
        && name[2..].chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

/// Colours (`#hex`, `rgb()/rgba()`, names), gradients, font lists, lengths and numbers. No `;{}<>\` or `url(`.
pub fn valid_value(value: &str) -> bool {
    let v = value.trim();
    !v.is_empty()
        && v.len() <= 240
        && !v.to_ascii_lowercase().contains("url(")
        && !v.to_ascii_lowercase().contains("expression")
        && v.chars().all(|c| c.is_ascii_alphanumeric() || " #(),.%-'\"_+".contains(c))
}

fn validate(s: &CustomStyle) -> AppResult<()> {
    let bad = |m: &str| Err(AppError::new(ErrorCode::InvalidArgument, format!("estilo \"{}\": {m}", s.label)));
    if !valid_id(&s.id) {
        return bad("identificador no válido");
    }
    if !valid_label(&s.label) {
        return bad("el nombre debe tener entre 1 y 40 caracteres");
    }
    for (k, v) in s.base.iter().chain(s.overrides.iter()) {
        if !valid_var_name(k) && !matches!(k.as_str(), "bg" | "fg" | "accent" | "border" | "bar" | "barFg" | "font" | "mono") {
            return bad(&format!("variable no admitida: {k}"));
        }
        if !valid_value(v) {
            return bad(&format!("valor no admitido en {k}"));
        }
    }
    Ok(())
}

pub fn styles_path(dir: &Path) -> PathBuf {
    dir.join("styles.json")
}

/// Loads the custom styles; invalid entries are dropped, an unreadable file is set aside.
pub fn load(dir: &Path) -> AppResult<LoadedStyles> {
    let path = styles_path(dir);
    let existed = path.exists();
    let file: Option<StylesFile> = read_json(&path)?;
    let recovered = existed && file.is_none();
    let styles = file
        .map(|f| f.styles.into_iter().filter(|s| validate(s).is_ok()).take(MAX_STYLES).collect())
        .unwrap_or_default();
    Ok(LoadedStyles { styles, recovered })
}

/// Validates and stores the whole list (ids and names unique, case-insensitive names).
pub fn save(dir: &Path, styles: Vec<CustomStyle>) -> AppResult<Vec<CustomStyle>> {
    if styles.len() > MAX_STYLES {
        return Err(AppError::new(ErrorCode::InvalidArgument, "demasiados estilos"));
    }
    let mut ids = std::collections::HashSet::new();
    let mut names = std::collections::HashSet::new();
    for s in &styles {
        validate(s)?;
        if !ids.insert(s.id.clone()) || !names.insert(s.label.trim().to_lowercase()) {
            return Err(AppError::new(ErrorCode::InvalidArgument, format!("nombre o identificador repetido: {}", s.label)));
        }
    }
    write_json(&styles_path(dir), &StylesFile { version: 1, styles: styles.clone() })?;
    Ok(styles)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn style(id: &str, label: &str) -> CustomStyle {
        let mut base = BTreeMap::new();
        base.insert("bg".into(), "#101820".into());
        let mut overrides = BTreeMap::new();
        overrides.insert("--mdw-toolbar-gradient-from".into(), "linear-gradient(135deg, #fff, rgb(1, 2, 3))".into());
        CustomStyle { id: id.into(), label: label.into(), base, overrides, created_at: 1, updated_at: 1 }
    }

    #[test]
    fn roundtrip_and_validation() {
        let d = tempfile::tempdir().unwrap();
        assert_eq!(load(d.path()).unwrap(), LoadedStyles { styles: vec![], recovered: false });
        let saved = save(d.path(), vec![style("custom-a1", "Mío")]).unwrap();
        assert_eq!(load(d.path()).unwrap().styles, saved);
        assert!(save(d.path(), vec![style("custom-a1", "A"), style("custom-a2", "a")]).is_err()); // same name
        assert!(save(d.path(), vec![style("dark", "X")]).is_err()); // built-in id
        let mut evil = style("custom-b", "Evil");
        evil.overrides.insert("--mdw-bg".into(), "red;} body{display:none".into());
        assert!(save(d.path(), vec![evil]).is_err());
        let mut url = style("custom-c", "Url");
        url.overrides.insert("--mdw-content-bg".into(), "url(http://x)".into());
        assert!(save(d.path(), vec![url]).is_err());
    }

    #[test]
    fn corrupt_file_is_set_aside() {
        let d = tempfile::tempdir().unwrap();
        std::fs::write(styles_path(d.path()), "{ nope").unwrap();
        let l = load(d.path()).unwrap();
        assert!(l.recovered && l.styles.is_empty());
        assert!(std::fs::read_dir(d.path()).unwrap().any(|e| e.unwrap().file_name().to_string_lossy().contains("corrupt")));
    }
}
