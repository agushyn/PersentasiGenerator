mod commands;
mod credentials;
mod db;
mod error;
mod projects;
mod renderer;
mod sidecar;
mod workspace_config;

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

/// Shared application state.
pub struct AppState {
    /// Tauri app data directory; resolved once during setup via platform APIs.
    pub data_dir: PathBuf,
    /// Fallback workspace root when no config file sets one.
    pub default_workspace_root: PathBuf,
    /// Path of `config.json` holding the workspace root override.
    pub config_path: PathBuf,
    /// Effective workspace root (config override or default); mutable at
    /// runtime via `workspace_set_root`.
    pub workspace_root: Mutex<PathBuf>,
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // The data directory comes from the app identifier, never a
            // hard-coded user profile path.
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;

            // Default workspace root: Documents (via platform API), falling
            // back to the app data directory when Documents is unavailable.
            let default_workspace_root = match app.path().document_dir() {
                Ok(documents) => documents
                    .join("Arya Duta Persentasion Studio")
                    .join("Projects"),
                Err(_) => data_dir.join("projects"),
            };

            let config_path = data_dir.join("config.json");
            let persisted = workspace_config::load(&config_path)
                .workspace_root
                .map(PathBuf::from)
                .unwrap_or_else(|| default_workspace_root.clone());

            app.manage(AppState {
                data_dir,
                default_workspace_root,
                config_path,
                workspace_root: Mutex::new(persisted),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_status,
            commands::db_poc_insert,
            commands::db_poc_list,
            commands::db_poc_update,
            commands::db_poc_delete,
            commands::sidecar_generate_poc,
            commands::credential_poc_set,
            commands::credential_poc_status,
            commands::credential_poc_delete,
            commands::project_create,
            commands::project_list,
            commands::project_get,
            commands::project_rename,
            commands::project_set_status,
            commands::project_delete,
            commands::workspace_get,
            commands::workspace_set_root,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Arya Duta Persentasion Studio");
}
