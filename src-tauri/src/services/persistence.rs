//! Small JSON files (settings, session, recovery metadata) with atomic writes and
//! tolerant reads: a corrupt file is renamed aside and defaults are used.

use super::fs_service::atomic_write;
use crate::error::AppResult;
use serde::{de::DeserializeOwned, Serialize};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

pub fn write_json<T: Serialize>(path: &Path, value: &T) -> AppResult<()> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    let bytes = serde_json::to_vec_pretty(value)
        .map_err(|e| crate::error::AppError::new(crate::error::ErrorCode::Io, e.to_string()))?;
    atomic_write(path, &bytes)
}

/// `Ok(None)` when the file is missing or was corrupt (then moved to `*.corrupt-<ts>`).
pub fn read_json<T: DeserializeOwned>(path: &Path) -> AppResult<Option<T>> {
    let bytes = match std::fs::read(path) {
        Ok(b) => b,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(e.into()),
    };
    match serde_json::from_slice(&bytes) {
        Ok(v) => Ok(Some(v)),
        Err(_) => {
            let ts = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
            let mut aside = path.as_os_str().to_owned();
            aside.push(format!(".corrupt-{ts}"));
            let _ = std::fs::rename(path, aside);
            Ok(None)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Deserialize;

    #[derive(Serialize, Deserialize, PartialEq, Debug)]
    struct S {
        version: u32,
    }

    #[test]
    fn roundtrip_creates_parent_dirs() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("sub").join("s.json");
        write_json(&p, &S { version: 1 }).unwrap();
        assert_eq!(read_json::<S>(&p).unwrap(), Some(S { version: 1 }));
    }

    #[test]
    fn missing_is_none() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(read_json::<S>(&dir.path().join("x.json")).unwrap(), None);
    }

    #[test]
    fn corrupt_is_moved_aside() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("s.json");
        std::fs::write(&p, "{ not json").unwrap();
        assert_eq!(read_json::<S>(&p).unwrap(), None);
        assert!(!p.exists());
        let moved = std::fs::read_dir(dir.path()).unwrap().count();
        assert_eq!(moved, 1);
    }
}
