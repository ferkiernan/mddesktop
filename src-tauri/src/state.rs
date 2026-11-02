use crate::services::authz::AuthorizedPaths;
use crate::services::watcher::{DocWatcher, KnownFingerprints};

#[derive(Default)]
pub struct AppState {
    pub authorized: AuthorizedPaths,
    pub known: KnownFingerprints,
    pub watcher: DocWatcher,
}
