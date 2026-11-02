//! Native menu. Items only emit `menu://action`; the frontend decides what to do.
//! Edit shortcuts (Ctrl+Z/Y/X/C/V/A) deliberately have no accelerator here (editor owns them).

use serde_json::json;
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
use tauri::{App, Emitter};

pub fn setup(app: &mut App) -> tauri::Result<()> {
    let item = |id: &str, text: &str, accel: Option<&str>| {
        let b = MenuItemBuilder::with_id(id, text);
        match accel {
            Some(a) => b.accelerator(a).build(app),
            None => b.build(app),
        }
    };

    let file = SubmenuBuilder::new(app, "Archivo")
        .item(&item("file.new", "Nuevo", Some("CmdOrCtrl+N"))?)
        .item(&item("file.open", "Abrir…", Some("CmdOrCtrl+O"))?)
        .separator()
        .item(&item("file.save", "Guardar", Some("CmdOrCtrl+S"))?)
        .item(&item("file.saveAs", "Guardar como…", Some("CmdOrCtrl+Shift+S"))?)
        .separator()
        .item(&item("file.close", "Cerrar documento", Some("CmdOrCtrl+W"))?)
        .item(&item("file.closeAll", "Cerrar todos", None)?)
        .separator()
        .item(&item("file.exit", "Salir", None)?)
        .build()?;

    let menu = MenuBuilder::new(app).item(&file).build()?;
    app.set_menu(menu)?;
    app.on_menu_event(|app, event| {
        let _ = app.emit("menu://action", json!({ "id": event.id().as_ref() }));
    });
    Ok(())
}
