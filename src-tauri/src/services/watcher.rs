//! Event-driven (no polling) observation of the open documents' parent directories.
//! Our own writes are filtered out by comparing against the last fingerprint we saw.

use super::authz::canonical;
use super::fs_service::{self, FileFingerprint};
use notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, DebounceEventResult, Debouncer};
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ChangeKind {
    Modified,
    Removed,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExternalChange {
    pub path: PathBuf,
    pub kind: ChangeKind,
    pub fingerprint: Option<FileFingerprint>,
}

fn key(p: &Path) -> String {
    crate::platform::path_key(p)
}

/// Last fingerprint produced by our own read/write per path (lower-cased key).
#[derive(Default, Clone)]
pub struct KnownFingerprints(Arc<Mutex<HashMap<String, FileFingerprint>>>);

impl KnownFingerprints {
    pub fn set(&self, path: &Path, fp: FileFingerprint) {
        self.0.lock().unwrap().insert(key(path), fp);
    }
    pub fn get(&self, path: &Path) -> Option<FileFingerprint> {
        self.0.lock().unwrap().get(&key(path)).cloned()
    }
}

/// Decides whether the current disk state of `path` is an external change.
pub fn classify(path: &Path, known: Option<&FileFingerprint>) -> Option<ExternalChange> {
    match fs_service::stat(path) {
        Ok(None) => Some(ExternalChange { path: path.to_path_buf(), kind: ChangeKind::Removed, fingerprint: None }),
        Ok(Some((mtime, size))) => {
            if let Some(k) = known {
                if k.mtime_ms == mtime && k.size == size {
                    return None;
                }
            }
            let bytes = std::fs::read(path).ok()?;
            let fp = fs_service::fingerprint_of_bytes(path, &bytes).ok()?;
            if known.is_some_and(|k| k.hash == fp.hash) {
                return None; // touched, same content
            }
            Some(ExternalChange { path: path.to_path_buf(), kind: ChangeKind::Modified, fingerprint: Some(fp) })
        }
        Err(_) => None,
    }
}

pub struct DocWatcher {
    debouncer: Mutex<Option<Debouncer<RecommendedWatcher>>>,
    files: Arc<Mutex<HashSet<String>>>,
    dirs: Mutex<HashSet<PathBuf>>,
}

impl Default for DocWatcher {
    fn default() -> Self {
        Self { debouncer: Mutex::new(None), files: Default::default(), dirs: Default::default() }
    }
}

impl DocWatcher {
    /// Replaces the watched set. `on_change` runs on the debouncer thread.
    pub fn set_paths(
        &self,
        paths: &[PathBuf],
        known: KnownFingerprints,
        on_change: impl Fn(ExternalChange) + Send + Sync + 'static,
    ) -> notify::Result<()> {
        let mut canon = Vec::new();
        for p in paths {
            if let Ok(c) = canonical(p) {
                canon.push(c);
            }
        }
        *self.files.lock().unwrap() = canon.iter().map(|p| key(p)).collect();

        let mut guard = self.debouncer.lock().unwrap();
        if guard.is_none() {
            let files = self.files.clone();
            let on_change = Arc::new(on_change);
            let deb = new_debouncer(Duration::from_millis(300), move |res: DebounceEventResult| {
                let Ok(events) = res else { return };
                let mut seen = HashSet::new();
                for ev in events {
                    let Ok(path) = canonical(&ev.path) else { continue };
                    let k = key(&path);
                    if !files.lock().unwrap().contains(&k) || !seen.insert(k) {
                        continue;
                    }
                    if let Some(change) = classify(&path, known.get(&path).as_ref()) {
                        on_change(change);
                    }
                }
            })?;
            *guard = Some(deb);
        }
        let deb = guard.as_mut().unwrap();
        let wanted: HashSet<PathBuf> =
            canon.iter().filter_map(|p| p.parent().map(|d| d.to_path_buf())).collect();
        let mut dirs = self.dirs.lock().unwrap();
        for d in dirs.difference(&wanted) {
            let _ = deb.watcher().unwatch(d);
        }
        for d in wanted.difference(&dirs.clone()) {
            deb.watcher().watch(d, RecursiveMode::NonRecursive)?;
        }
        *dirs = wanted;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;

    fn fp_of(p: &Path) -> FileFingerprint {
        let b = std::fs::read(p).unwrap();
        fs_service::fingerprint_of_bytes(p, &b).unwrap()
    }

    #[test]
    fn classify_ignores_own_state_and_touch_but_reports_edits_and_removal() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("a.md");
        std::fs::write(&p, "one").unwrap();
        let known = fp_of(&p);
        assert!(classify(&p, Some(&known)).is_none());
        std::fs::write(&p, "one").unwrap(); // same content, new mtime
        assert!(classify(&p, Some(&known)).is_none());
        std::fs::write(&p, "two!").unwrap();
        assert_eq!(classify(&p, Some(&known)).unwrap().kind, ChangeKind::Modified);
        std::fs::remove_file(&p).unwrap();
        assert_eq!(classify(&p, Some(&known)).unwrap().kind, ChangeKind::Removed);
    }

    #[test]
    fn emits_event_when_a_watched_file_changes_externally() {
        let dir = tempfile::tempdir().unwrap();
        let p = dir.path().join("a.md");
        std::fs::write(&p, "one").unwrap();
        let known = KnownFingerprints::default();
        known.set(&canonical(&p).unwrap(), fp_of(&p));
        let (tx, rx) = mpsc::channel();
        let tx = Mutex::new(tx);
        let w = DocWatcher::default();
        w.set_paths(&[p.clone()], known, move |c| {
            let _ = tx.lock().unwrap().send(c);
        })
        .unwrap();
        std::thread::sleep(Duration::from_millis(200));
        std::fs::write(&p, "changed elsewhere").unwrap();
        let c = rx.recv_timeout(Duration::from_secs(5)).expect("no event");
        assert_eq!(c.kind, ChangeKind::Modified);
    }
}
