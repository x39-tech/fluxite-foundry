#[cfg(target_os = "macos")]
use tauri::{
    AppHandle, Wry,
    menu::{AboutMetadata, Menu, PredefinedMenuItem, Submenu},
};

#[cfg(target_os = "macos")]
fn build_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let package_info = app.package_info();
    let about_metadata = AboutMetadata {
        name: Some(package_info.name.clone()),
        version: Some(package_info.version.to_string()),
        ..Default::default()
    };

    // On macOS the first submenu always becomes the application menu, whatever
    // its label.
    let app_menu = Submenu::with_items(
        app,
        package_info.name.clone(),
        true,
        &[
            &PredefinedMenuItem::about(app, None, Some(about_metadata))?,
            &PredefinedMenuItem::services(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, None)?,
            &PredefinedMenuItem::hide_others(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, None)?,
        ],
    )?;

    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;

    let view_menu = Submenu::with_items(
        app,
        "View",
        true,
        &[&PredefinedMenuItem::fullscreen(app, None)?],
    )?;

    let window_menu = Submenu::with_items(
        app,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::maximize(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, None)?,
        ],
    )?;

    Menu::with_items(app, &[&app_menu, &edit_menu, &view_menu, &window_menu])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init());

    // The updater replaces the installed app, which only makes sense on desktop.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    // Only macOS gets a menu bar (it is expected on that system).
    #[cfg(target_os = "macos")]
    let builder = builder.menu(build_menu);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
