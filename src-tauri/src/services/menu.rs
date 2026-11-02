//! Native menu. Items only emit `menu://action`; the frontend decides what to do.
//! No accelerators are registered here: the frontend shortcut manager owns every key
//! binding (one place, Ctrl/Cmd mapping, no double firing, no clash with the editor).
//! Shortcut hints are shown in the labels after a tab, which Windows renders right-aligned.

use serde_json::json;
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{App, Emitter};

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

    let menu = MenuBuilder::new(app).item(&file).item(&edit).item(&insert).item(&view).build()?;
    app.set_menu(menu)?;
    app.on_menu_event(|app, event| {
        let _ = app.emit("menu://action", json!({ "id": event.id().as_ref() }));
    });
    Ok(())
}
