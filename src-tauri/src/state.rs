use crate::services::authz::AuthorizedPaths;
use crate::services::watcher::{DocWatcher, KnownFingerprints};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::menu::{CheckMenuItem, PredefinedMenuItem, Submenu};
use tauri::Wry;

#[derive(Default)]
pub struct AppState {
    pub authorized: AuthorizedPaths,
    pub known: KnownFingerprints,
    pub watcher: DocWatcher,
    pub launch_files: Mutex<Vec<PathBuf>>,
    /// Check items of Configuración > Estilo del editor, by preset id.
    pub style_items: Mutex<Vec<(String, CheckMenuItem<Wry>)>>,
    /// "Mostrar barra de herramientas" (Ver) and "Historial de versiones" (Configuración) check items.
    /// Configuración > Estilo del editor, to append the user's own styles (spec 004).
    pub style_menu: Mutex<Option<Submenu<Wry>>>,
    /// Separator + check items of the custom styles currently in that submenu.
    pub custom_style_items: Mutex<Vec<(String, CheckMenuItem<Wry>)>>,
    pub custom_style_separator: Mutex<Option<PredefinedMenuItem<Wry>>>,
    pub view_items: Mutex<Option<(CheckMenuItem<Wry>, CheckMenuItem<Wry>, CheckMenuItem<Wry>)>>,
}
