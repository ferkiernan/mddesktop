use crate::services::authz::AuthorizedPaths;
use crate::services::watcher::{DocWatcher, KnownFingerprints};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::menu::CheckMenuItem;
use tauri::Wry;

#[derive(Default)]
pub struct AppState {
    pub authorized: AuthorizedPaths,
    pub known: KnownFingerprints,
    pub watcher: DocWatcher,
    pub launch_files: Mutex<Vec<PathBuf>>,
    /// Check items of Configuración > Estilo del editor, by preset id.
    pub style_items: Mutex<Vec<(String, CheckMenuItem<Wry>)>>,
}
