use crate::services::authz::AuthorizedPaths;
use crate::services::watcher::{DocWatcher, KnownFingerprints};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    pub authorized: AuthorizedPaths,
    pub known: KnownFingerprints,
    pub watcher: DocWatcher,
    pub launch_files: Mutex<Vec<PathBuf>>,
}
