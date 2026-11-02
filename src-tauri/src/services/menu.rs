//! Native menu. Items only emit `menu://action`; the frontend decides what to do.
//! No accelerators are registered here: the frontend shortcut manager owns every key
//! binding (one place, Ctrl/Cmd mapping, no double firing, no clash with the editor).
//! Shortcut hints are shown in the labels after a tab, which Windows renders right-aligned.

use crate::state::AppState;
use serde_json::json;
use tauri::menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{App, Emitter, Manager};

/// Editor style presets (id, label). Must match `src/features/settings/editorStyles.ts`
/// (a Vitest test compares both lists).
pub const EDITOR_STYLES: &[(&str, &str)] = &[
    ("default", "Default"),
    ("dark", "Oscuro"),
    ("notebook", "Notebook (pastel)"),
    ("terminal", "Terminal"),
    ("winamp", "Winamp"),
    ("cg", "CG Theme"),
    ("anthropic", "Anthropic"),
];

pub fn setup(app: &mut App) -> tauri::Result<()> {
    let item = |id: &str, text: &str| MenuItemBuilder::with_id(id, text).build(app);

    let file = SubmenuBuilder::new(app, "Archivo")
        .item(&item("file.new", "Nuevo\tCtrl+N")?)
        .item(&item("file.open", "Abrir…\tCtrl+O")?)
        .separator()
        .item(&item("file.save", "Guardar\tCtrl+S")?)
        .item(&item("file.saveAs", "Guardar como…\tCtrl+Shift+S")?)
        .separator()
        .item(&item("file.close", "Cerrar documento\tCtrl+W")?)
        .item(&item("file.closeAll", "Cerrar todos")?)
        .separator()
        .item(&item("file.exit", "Salir")?)
        .build()?;

    let edit = SubmenuBuilder::new(app, "Edición")
        .item(&item("edit.undo", "Deshacer\tCtrl+Z")?)
        .item(&item("edit.redo", "Rehacer\tCtrl+Y")?)
        .separator()
        .item(&item("edit.cut", "Cortar\tCtrl+X")?)
        .item(&item("edit.copy", "Copiar\tCtrl+C")?)
        .item(&item("edit.paste", "Pegar\tCtrl+V")?)
        .item(&item("edit.selectAll", "Seleccionar todo\tCtrl+A")?)
        .build()?;

    let insert = SubmenuBuilder::new(app, "Insertar")
        .item(&item("insert.image", "Imagen…")?)
        .build()?;

    let view = SubmenuBuilder::new(app, "Ver")
        .item(&item("view.toggleTheme", "Alternar tema claro/oscuro")?)
        .separator()
        .item(&item("view.zoomIn", "Acercar interfaz\tCtrl++")?)
        .item(&item("view.zoomOut", "Alejar interfaz\tCtrl+-")?)
        .item(&item("view.zoomReset", "Restablecer zoom\tCtrl+0")?)
        .separator()
        .item(&item("view.toggleStatusBar", "Mostrar/ocultar barra de estado")?)
        .build()?;

    // Configuración > Estilo del editor: one check item per preset (the frontend keeps the mark in sync)
    let state = app.state::<AppState>();
    let mut styles = SubmenuBuilder::new(app, "Estilo del editor");
    for (id, label) in EDITOR_STYLES {
        let check = CheckMenuItemBuilder::with_id(format!("style.{id}"), *label)
            .checked(*id == "default")
            .build(app)?;
        styles = styles.item(&check);
        state.style_items.lock().unwrap().push((id.to_string(), check));
    }
    let settings = SubmenuBuilder::new(app, "Configuración").item(&styles.build()?).build()?;

    let menu = MenuBuilder::new(app)
        .item(&file)
        .item(&edit)
        .item(&insert)
        .item(&view)
        .item(&settings)
        .build()?;
    app.set_menu(menu)?;
    app.on_menu_event(|app, event| {
        let _ = app.emit("menu://action", json!({ "id": event.id().as_ref() }));
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::EDITOR_STYLES;

    #[test]
    fn style_ids_are_valid_settings_values() {
        for (id, _) in EDITOR_STYLES {
            assert!(!id.is_empty() && id.len() <= 32);
            assert!(id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-'));
        }
    }
}
