//! Disk I/O owned by Rust: fingerprints, document read, atomic write.

use super::encoding::{self, Eol};
use crate::error::{AppError, AppResult, ErrorCode};
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileFingerprint {
    pub mtime_ms: u64,
    pub size: u64,
    pub hash: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadResult {
    pub path: PathBuf,
    pub content: String,
    pub encoding: String,
    pub bom: bool,
    pub eol: Eol,
    pub fingerprint: FileFingerprint,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteRequest {
    pub path: PathBuf,
    pub content: String,
    pub eol: Eol,
    pub bom: bool,
    pub encoding: String,
    #[serde(default)]
    pub convert_to_utf8: bool,
    pub expected_fingerprint: Option<FileFingerprint>,
    #[serde(default)]
    pub overwrite_external: bool,
}

pub fn hash_bytes(bytes: &[u8]) -> String {
    format!("{:032x}", xxhash_rust::xxh3::xxh3_128(bytes))
}

/// Cheap metadata: (mtime_ms, size). `None` if the file does not exist.
pub fn stat(path: &Path) -> AppResult<Option<(u64, u64)>> {
    match std::fs::metadata(path) {
        Ok(m) => {
            let mtime = m
                .modified()?
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);
            Ok(Some((mtime, m.len())))
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.into()),
    }
}

pub fn fingerprint_of_bytes(path: &Path, bytes: &[u8]) -> AppResult<FileFingerprint> {
    let (mtime_ms, _) = stat(path)?.ok_or_else(|| AppError::new(ErrorCode::NotFound, "file vanished"))?;
    Ok(FileFingerprint { mtime_ms, size: bytes.len() as u64, hash: hash_bytes(bytes) })
}

pub fn read_document(path: &Path, accept_large: bool, warn_bytes: u64) -> AppResult<ReadResult> {
    let (_, size) = stat(path)?.ok_or_else(|| AppError::new(ErrorCode::NotFound, "file not found"))?;
    if size > warn_bytes && !accept_large {
        return Err(AppError::new(ErrorCode::TooLarge, "file exceeds the large-file threshold")
            .with_details(serde_json::json!({ "size": size })));
    }
    let bytes = std::fs::read(path)?;
    let fingerprint = fingerprint_of_bytes(path, &bytes)?;
    let d = encoding::decode(&bytes)?;
    Ok(ReadResult {
        path: path.to_path_buf(),
        content: d.text,
        encoding: d.encoding,
        bom: d.bom,
        eol: d.eol,
        fingerprint,
    })
}

/// True when disk content differs from what the caller last saw.
fn has_external_change(path: &Path, expected: &FileFingerprint) -> AppResult<bool> {
    let Some((mtime, size)) = stat(path)? else { return Ok(false) };
    if mtime == expected.mtime_ms && size == expected.size {
        return Ok(false);
    }
    // metadata differs: compare content so a plain `touch` is not a conflict
    Ok(hash_bytes(&std::fs::read(path)?) != expected.hash)
}

/// Writes `bytes` to a temp file next to `path`, then replaces `path`.
/// `before_rename` lets tests simulate a failure; the original must stay intact.
pub fn atomic_write_with(
    path: &Path,
    bytes: &[u8],
    before_rename: impl FnOnce() -> std::io::Result<()>,
) -> AppResult<()> {
    let dir = path.parent().ok_or_else(|| AppError::new(ErrorCode::InvalidArgument, "no parent"))?;
    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("doc");
    let tmp = dir.join(format!(".{name}.{}.mddtmp", uuid::Uuid::new_v4().simple()));
    let result = (|| -> std::io::Result<()> {
        let mut f = std::fs::File::create(&tmp)?;
        f.write_all(bytes)?;
        f.sync_all()?;
        drop(f);
        before_rename()?;
        std::fs::rename(&tmp, path)
    })();
    if let Err(e) = result {
        let _ = std::fs::remove_file(&tmp);
        return Err(e.into());
    }
    Ok(())
}

pub fn atomic_write(path: &Path, bytes: &[u8]) -> AppResult<()> {
    atomic_write_with(path, bytes, || Ok(()))
}

pub fn write_document(req: &WriteRequest) -> AppResult<FileFingerprint> {
    let path = req.path.as_path();
    let exists = stat(path)?.is_some();
    if exists && !req.overwrite_external {
        let conflict = match &req.expected_fingerprint {
            Some(exp) => has_external_change(path, exp)?,
            None => true, // opening a file we never read: do not clobber it
        };
        if conflict {
            return Err(AppError::new(
                ErrorCode::ExternalConflict,
                "the file changed on disk since it was read",
            ));
        }
    }
    let bytes = encoding::encode(&req.content, req.eol, req.bom, &req.encoding, req.convert_to_utf8)?;
    if exists {
        let current = std::fs::read(path)?;
        if current == bytes {
            return fingerprint_of_bytes(path, &current); // nothing to write
        }
    }
    atomic_write(path, &bytes)?;
    fingerprint_of_bytes(path, &bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn req(path: &Path, content: &str) -> WriteRequest {
        WriteRequest {
            path: path.to_path_buf(),
            content: content.into(),
            eol: Eol::Lf,
            bom: false,
            encoding: "utf-8".into(),
            convert_to_utf8: false,
            expected_fingerprint: None,
            overwrite_external: false,
        }
    }

    #[test]
    fn read_normalizes_crlf_and_reports_fingerprint() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("a.md");
        std::fs::write(&p, b"a\r\nb\r\n").unwrap();
        let r = read_document(&p, false, 1024).unwrap();
        assert_eq!((r.content.as_str(), r.eol), ("a\nb\n", Eol::Crlf));
        assert_eq!(r.fingerprint.size, 6);
    }

    #[test]
    fn large_file_needs_acceptance() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("a.md");
        std::fs::write(&p, vec![b'x'; 100]).unwrap();
        assert_eq!(read_document(&p, false, 10).unwrap_err().code, ErrorCode::TooLarge);
        assert!(read_document(&p, true, 10).is_ok());
    }

    #[test]
    fn write_preserves_crlf_and_roundtrips() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("a.md");
        std::fs::write(&p, b"a\r\nb\r\n").unwrap();
        let r = read_document(&p, false, 1024).unwrap();
        let mut w = req(&p, "a\nb\nc\n");
        w.eol = r.eol;
        w.expected_fingerprint = Some(r.fingerprint);
        write_document(&w).unwrap();
        assert_eq!(std::fs::read(&p).unwrap(), b"a\r\nb\r\nc\r\n");
    }

    #[test]
    fn external_change_is_a_conflict_unless_overwrite() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("a.md");
        std::fs::write(&p, "one").unwrap();
        let fp = read_document(&p, false, 1024).unwrap().fingerprint;
        std::fs::write(&p, "changed elsewhere!").unwrap();
        let mut w = req(&p, "mine");
        w.expected_fingerprint = Some(fp);
        assert_eq!(write_document(&w).unwrap_err().code, ErrorCode::ExternalConflict);
        assert_eq!(std::fs::read_to_string(&p).unwrap(), "changed elsewhere!");
        w.overwrite_external = true;
        write_document(&w).unwrap();
        assert_eq!(std::fs::read_to_string(&p).unwrap(), "mine");
    }

    #[test]
    fn existing_file_without_expectation_is_not_clobbered() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("a.md");
        std::fs::write(&p, "keep").unwrap();
        assert_eq!(write_document(&req(&p, "x")).unwrap_err().code, ErrorCode::ExternalConflict);
    }

    #[test]
    fn identical_content_is_not_rewritten() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("a.md");
        std::fs::write(&p, "same").unwrap();
        let fp = read_document(&p, false, 1024).unwrap().fingerprint;
        let mut w = req(&p, "same");
        w.expected_fingerprint = Some(fp.clone());
        assert_eq!(write_document(&w).unwrap(), fp);
    }

    #[test]
    fn non_utf8_requires_conversion_and_writes_nothing() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("a.md");
        let mut w = req(&p, "x");
        w.encoding = "windows-1252".into();
        assert_eq!(write_document(&w).unwrap_err().code, ErrorCode::EncodingConversionRequired);
        assert!(!p.exists());
        w.convert_to_utf8 = true;
        write_document(&w).unwrap();
        assert_eq!(std::fs::read_to_string(&p).unwrap(), "x");
    }

    #[test]
    fn failed_write_leaves_original_intact_and_no_temp_files() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("a.md");
        std::fs::write(&p, "original").unwrap();
        let err = atomic_write_with(&p, b"new", || {
            Err(std::io::Error::new(std::io::ErrorKind::Other, "simulated crash"))
        })
        .unwrap_err();
        assert_eq!(err.code, ErrorCode::Io);
        assert_eq!(std::fs::read_to_string(&p).unwrap(), "original");
        let leftovers = std::fs::read_dir(dir.path()).unwrap().count();
        assert_eq!(leftovers, 1);
    }

    #[test]
    fn deleted_file_can_be_recreated() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("a.md");
        let mut w = req(&p, "back");
        w.expected_fingerprint = Some(FileFingerprint { mtime_ms: 1, size: 1, hash: "x".into() });
        write_document(&w).unwrap();
        assert_eq!(std::fs::read_to_string(&p).unwrap(), "back");
    }
}
