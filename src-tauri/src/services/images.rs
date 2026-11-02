//! Copying a picked image into `assets/` next to its document (FR-025/026).

use super::fs_service::atomic_write;
use crate::error::{AppError, AppResult, ErrorCode};
use serde::Serialize;
use std::path::{Path, PathBuf};

pub const ASSETS_DIR: &str = "assets";

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    /// Path to put in the Markdown, relative to the document, with `/` separators.
    pub relative_path: String,
    pub copied: bool,
    pub existed_before: bool,
}

/// Copies `source` into `<document dir>/assets/`. Never overwrites a different existing file
/// unless `overwrite` is set; an image already inside `assets/` is just referenced.
pub fn import_image(document: &Path, source: &Path, overwrite: bool) -> AppResult<ImportResult> {
    let doc_dir = document
        .parent()
        .ok_or_else(|| AppError::new(ErrorCode::InvalidArgument, "document has no directory"))?;
    let name = source
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| AppError::new(ErrorCode::InvalidArgument, "image has no file name"))?;
    let assets = doc_dir.join(ASSETS_DIR);
    let dest = assets.join(name);
    let relative_path = format!("{ASSETS_DIR}/{name}");

    if dest.exists() {
        let same_file = match (dest.canonicalize(), source.canonicalize()) {
            (Ok(a), Ok(b)) => a == b,
            _ => false,
        };
        if same_file {
            return Ok(ImportResult { relative_path, copied: false, existed_before: false });
        }
        if !overwrite {
            return Ok(ImportResult { relative_path, copied: false, existed_before: true });
        }
    }
    std::fs::create_dir_all(&assets)?;
    let bytes = std::fs::read(source)?;
    let existed_before = dest.exists();
    atomic_write(&dest, &bytes)?;
    Ok(ImportResult { relative_path, copied: true, existed_before })
}

pub fn dir_of(path: &Path) -> Option<PathBuf> {
    path.parent().map(|p| p.to_path_buf())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup() -> (tempfile::TempDir, PathBuf, PathBuf) {
        let d = tempfile::tempdir().unwrap();
        let doc = d.path().join("doc").join("nota.md");
        std::fs::create_dir_all(doc.parent().unwrap()).unwrap();
        std::fs::write(&doc, "x").unwrap();
        let img = d.path().join("fotos").join("gato.png");
        std::fs::create_dir_all(img.parent().unwrap()).unwrap();
        std::fs::write(&img, b"PNG1").unwrap();
        (d, doc, img)
    }

    #[test]
    fn copies_into_assets_with_a_relative_forward_slash_path() {
        let (_d, doc, img) = setup();
        let r = import_image(&doc, &img, false).unwrap();
        assert_eq!(
            r,
            ImportResult { relative_path: "assets/gato.png".into(), copied: true, existed_before: false }
        );
        assert_eq!(std::fs::read(doc.parent().unwrap().join("assets/gato.png")).unwrap(), b"PNG1");
    }

    #[test]
    fn existing_file_is_not_overwritten_without_consent() {
        let (_d, doc, img) = setup();
        let assets = doc.parent().unwrap().join("assets");
        std::fs::create_dir_all(&assets).unwrap();
        std::fs::write(assets.join("gato.png"), b"OTRA").unwrap();
        let r = import_image(&doc, &img, false).unwrap();
        assert_eq!((r.copied, r.existed_before), (false, true));
        assert_eq!(std::fs::read(assets.join("gato.png")).unwrap(), b"OTRA");
        let r = import_image(&doc, &img, true).unwrap();
        assert_eq!((r.copied, r.existed_before), (true, true));
        assert_eq!(std::fs::read(assets.join("gato.png")).unwrap(), b"PNG1");
    }

    #[test]
    fn image_already_in_assets_is_only_referenced() {
        let (_d, doc, _img) = setup();
        let assets = doc.parent().unwrap().join("assets");
        std::fs::create_dir_all(&assets).unwrap();
        let inside = assets.join("ya.png");
        std::fs::write(&inside, b"Z").unwrap();
        let r = import_image(&doc, &inside, false).unwrap();
        assert_eq!(r, ImportResult { relative_path: "assets/ya.png".into(), copied: false, existed_before: false });
    }
}
