mod commands;
mod credentials;
mod db;
mod error;
mod renderer;
mod sidecar;

use std::path::PathBuf;
use tauri::Manager;

/// Shared application state for Phase 0.
pub struct AppState {
    /// Tauri app data directory; resolved once during setup via platform APIs.
    pub data_dir: PathBuf,
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // The data directory comes from the app identifier, never a
            // hard-coded user profile path.
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            app.manage(AppState { data_dir });
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running Arya Duta Persentasion Studio");
}
