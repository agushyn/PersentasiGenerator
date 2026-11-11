//! Typed Tauri IPC commands for the Phase 0 harness.
//!
//! Contract rules honored here:
//! - Inputs are validated before touching services.
//! - Errors serialize as `{ code, message }`.
//! - No command ever returns a credential secret.

use serde::Serialize;
use tauri::State;

use crate::credentials;
use crate::db::{self, PocItem};
use crate::error::AppResult;
use crate::renderer;
use crate::sidecar;
use crate::AppState;

#[derive(Serialize)]
pub struct AppStatus {
    pub app_name: String,
    pub version: String,
    pub db_path: String,
    pub sidecar_found: bool,
    pub sidecar_script_found: bool,
    pub renderer: String,
}

#[tauri::command]
pub fn app_status(state: State<'_, AppState>) -> AppResult<AppStatus> {
    Ok(AppStatus {
        app_name: "Arya Duta Persentasion Studio".into(),
        version: env!("CARGO_PKG_VERSION").into(),
        db_path: state.data_dir.join("poc.db").to_string_lossy().into_owned(),
        sidecar_found: sidecar::resolve_node_exe().is_some(),
        sidecar_script_found: sidecar::resolve_engine_script().is_some(),
        renderer: match renderer::detect() {
            Some(path) => format!("LibreOffice found: {}", path.display()),
            None => "LibreOffice not found (preview rendering and PDF export unavailable)".into(),
        },
    })
}

fn open_db(state: &State<'_, AppState>) -> AppResult<rusqlite::Connection> {
    let conn = db::open(&state.data_dir.join("poc.db"))?;
    db::run_migrations(&conn)?;
    Ok(conn)
}

#[tauri::command]
pub fn db_poc_insert(state: State<'_, AppState>, name: String, value: String) -> AppResult<i64> {
    if name.trim().is_empty() {
        return Err(crate::error::AppError::Validation(
            "name must not be empty".into(),
        ));
    }
    let conn = open_db(&state)?;
    db::insert(&conn, &name, &value)
}

#[tauri::command]
pub fn db_poc_list(state: State<'_, AppState>) -> AppResult<Vec<PocItem>> {
    let conn = open_db(&state)?;
    db::list(&conn)
}

#[tauri::command]
pub fn db_poc_update(state: State<'_, AppState>, id: i64, value: String) -> AppResult<bool> {
    let conn = open_db(&state)?;
    db::update(&conn, id, &value)
}

#[tauri::command]
pub fn db_poc_delete(state: State<'_, AppState>, id: i64) -> AppResult<bool> {
    let conn = open_db(&state)?;
    db::delete(&conn, id)
}

/// Builds the fixed Phase 0 manifest: one title slide, one editable-text
/// slide, one editable-shapes slide. Nothing is flattened into an image.
fn build_poc_manifest(output_path: &std::path::Path) -> serde_json::Value {
    serde_json::json!({
        "schema_version": "1.0",
        "output_path": output_path.to_string_lossy(),
        "slides": [
            {
                "slide_id": "slide-001",
                "slide_type": "editorial-cover",
                "title": "Arya Duta Persentasion Studio",
                "subtitle": "Phase 0 Architecture Validation",
                "kicker": "Proof of Concept"
            },
            {
                "slide_id": "slide-002",
                "slide_type": "editable-text",
                "heading": "Editable text elements",
                "body": "Every paragraph on this slide is a native PowerPoint text box. It can be selected, edited, and restyled inside Microsoft PowerPoint after export."
            },
            {
                "slide_id": "slide-003",
                "slide_type": "editable-shapes",
                "shapes": [
                    {
                        "shape": "rect",
                        "x": 0.8, "y": 1.2, "w": 4.6, "h": 2.4,
                        "fill": "C65D3B",
                        "text": "Editable rectangle"
                    },
                    {
                        "shape": "ellipse",
                        "x": 6.0, "y": 1.2, "w": 4.6, "h": 2.4,
                        "fill": "788477",
                        "text": "Editable ellipse"
                    },
                    {
                        "shape": "rect",
                        "x": 3.4, "y": 4.3, "w": 4.6, "h": 1.4,
                        "fill": "8A8982",
                        "text": "Third shape"
                    }
                ]
            }
        ]
    })
}

#[derive(Serialize)]
pub struct SidecarResult {
    pub ok: bool,
    pub output_path: Option<String>,
    pub slide_count: Option<u32>,
    pub duration_ms: u64,
    pub error_code: Option<String>,
    pub message: Option<String>,
}

#[tauri::command]
pub fn sidecar_generate_poc(state: State<'_, AppState>) -> AppResult<SidecarResult> {
    let export_dir = state.data_dir.join("poc-export");
    std::fs::create_dir_all(&export_dir)?;
    let output_path = export_dir.join("phase0-poc.pptx");

    // A previous run's artifact is removed first so this command's result
    // always reflects a fresh generation.
    let _ = std::fs::remove_file(&output_path);

    let manifest = build_poc_manifest(&output_path);
    let started = std::time::Instant::now();

    let output = sidecar::generate(&manifest.to_string())?;

    let expected = manifest["slides"]
        .as_array()
        .map(|slides| slides.len() as u32)
        .unwrap_or(0);
    if output.slide_count != Some(expected) {
        return Err(crate::error::AppError::Sidecar {
            code: "PPTX_GENERATION_FAILED".into(),
            message: format!(
                "sidecar reported {} slides, expected {expected}",
                output.slide_count.unwrap_or(0)
            ),
        });
    }

    Ok(SidecarResult {
        ok: true,
        output_path: output.output_path,
        slide_count: output.slide_count,
        duration_ms: started.elapsed().as_millis() as u64,
        error_code: None,
        message: None,
    })
}

#[tauri::command]
pub fn credential_poc_set(account: String, secret: String) -> AppResult<()> {
    credentials::set_secret(&account, &secret)
}

#[tauri::command]
pub fn credential_poc_status(account: String) -> AppResult<bool> {
    credentials::is_present(&account)
}

#[tauri::command]
pub fn credential_poc_delete(account: String) -> AppResult<bool> {
    credentials::delete_secret(&account)
}
