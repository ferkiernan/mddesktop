# Contract: estilos propios

- `styles_load() -> { styles: CustomStyle[], recovered: bool }`
- `styles_save(styles: CustomStyle[]) -> CustomStyle[]`: valida la lista completa; error `INVALID_ARGUMENT` con el motivo (nombre repetido, valor no admitido…).
- `set_custom_styles_menu(items: [id, label][], active: string)`: reemplaza la sección de estilos propios de Configuración → Estilo del editor.
- Menú: `settings.themes` abre el panel.
