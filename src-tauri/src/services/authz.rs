//! Set of paths the user has authorized (dialog, argv, OS drop, own session file).
//! The frontend can never add paths; every command checks membership here.

use crate::error::{AppError, AppResult, ErrorCode};
use std::collections::HashSet;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;

#[derive(Default)]
pub struct AuthorizedPaths {
    set: Mutex<HashSet<PathBuf>>,
}

pub fn is_markdown(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| matches!(e.to_ascii_lowercase().as_str(), "md" | "markdown"))
        .unwrap_or(false)
}

/// Strips the Windows verbatim prefix so paths dedupe and display well.
fn simplify(p: PathBuf) -> PathBuf {
    let s = p.to_string_lossy();
    match s.strip_prefix(r"\\?\") {
        Some(rest) if !rest.starts_with("UNC\\") => PathBuf::from(rest),
        _ => p,
    }
}

/// Canonical form; for a file that does not exist yet, canonicalizes its parent.
pub fn canonical(path: &Path) -> AppResult<PathBuf> {
    if path.components().any(|c| matches!(c, Component::ParentDir)) {
        return Err(AppError::new(ErrorCode::InvalidArgument, "path contains '..'"));
    }
    if !path.is_absolute() {
        return Err(AppError::new(ErrorCode::InvalidArgument, "path must be absolute"));
    }
    match path.canonicalize() {
        Ok(p) => Ok(simplify(p)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            let name = path
                .file_name()
                .ok_or_else(|| AppError::new(ErrorCode::InvalidArgument, "path has no file name"))?;
            let parent = path
                .parent()
                .ok_or_else(|| AppError::new(ErrorCode::InvalidArgument, "path has no parent"))?;
            Ok(simplify(parent.canonicalize()?).join(name))
        }
        Err(e) => Err(e.into()),
    }
}

impl AuthorizedPaths {
    /// Adds a trusted path (caller must be a trusted origin). Returns the canonical path.
    pub fn authorize(&self, path: &Path) -> AppResult<PathBuf> {
        if !is_markdown(path) {
            return Err(AppError::new(ErrorCode::NotMarkdown, "only .md/.markdown files are allowed"));
        }
        let c = canonical(path)?;
        self.set.lock().unwrap().insert(c.clone());
        Ok(c)
    }

    /// Validates a path coming from the frontend; returns its canonical form.
    pub fn check(&self, path: &Path) -> AppResult<PathBuf> {
        if !is_markdown(path) {
            return Err(AppError::new(ErrorCode::NotMarkdown, "only .md/.markdown files are allowed"));
        }
        let c = canonical(path)?;
        if self.set.lock().unwrap().contains(&c) {
            Ok(c)
        } else {
            Err(AppError::new(ErrorCode::NotAuthorized, "path was not authorized by the user"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn authorizes_then_checks() {
        let dir = tempfile::tempdir().unwrap();
        let f = dir.path().join("a.md");
        std::fs::write(&f, "x").unwrap();
        let a = AuthorizedPaths::default();
        assert_eq!(a.check(&f).unwrap_err().code, ErrorCode::NotAuthorized);
        a.authorize(&f).unwrap();
        a.check(&f).unwrap();
    }

    #[test]
    fn rejects_non_markdown_parent_dir_and_relative() {
        let a = AuthorizedPaths::default();
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(a.authorize(&dir.path().join("a.txt")).unwrap_err().code, ErrorCode::NotMarkdown);
        assert_eq!(
            a.authorize(&dir.path().join("..").join("a.md")).unwrap_err().code,
            ErrorCode::InvalidArgument
        );
        assert_eq!(a.authorize(Path::new("a.md")).unwrap_err().code, ErrorCode::InvalidArgument);
    }

    #[test]
    fn new_file_path_is_canonicalized_via_parent() {
        let dir = tempfile::tempdir().unwrap();
        let a = AuthorizedPaths::default();
        let p = a.authorize(&dir.path().join("new.MD")).unwrap();
        assert!(a.check(&dir.path().join("new.MD")).is_ok());
        assert!(p.ends_with("new.MD"));
    }
}
