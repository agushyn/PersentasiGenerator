//! Typed Tauri IPC commands for the Phase 0 harness.
//!
//! Contract rules honored here:
//! - Inputs are validated before touching services.
//! - Errors serialize as `{ code, message }`.
//! - No command ever returns a credential secret.

use serde::Serialize;
use std::path::PathBuf;
use tauri::State;

use crate::credentials;
use crate::db::{self, PocItem};
use crate::error::AppResult;
use crate::renderer;
use crate::sidecar;
use crate::workspace_config;
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

// ---------------------------------------------------------------------------
// Phase 2: projects and workspace
// ---------------------------------------------------------------------------

use crate::projects::{self, NewProject, Project};

fn current_workspace_root(state: &State<'_, AppState>) -> PathBuf {
    state.workspace_root.lock().unwrap().clone()
}

#[derive(Serialize)]
pub struct WorkspaceInfo {
    /// Effective root where new project folders are created.
    pub root: String,
    /// Built-in fallback root (Documents based) shown for reference.
    pub default_root: String,
    /// True when the effective root was persisted by the user.
    pub customized: bool,
}

#[tauri::command]
pub fn project_create(
    state: State<'_, AppState>,
    title: String,
    topic: Option<String>,
    audience: Option<String>,
    language: Option<String>,
    duration_minutes: Option<i64>,
) -> AppResult<Project> {
    let new = NewProject {
        title,
        topic,
        audience,
        language,
        duration_minutes,
    };
    let conn = open_db(&state)?;
    let root = current_workspace_root(&state);
    projects::ensure_workspace_root(&root)?;
    projects::create(&conn, &root, &new)
}

#[tauri::command]
pub fn project_list(state: State<'_, AppState>) -> AppResult<Vec<Project>> {
    let conn = open_db(&state)?;
    projects::list(&conn)
}

/// Returns one project and repairs its workspace (missing folders or
/// `project.json` are recreated from the database row).
#[tauri::command]
pub fn project_get(state: State<'_, AppState>, id: String) -> AppResult<Project> {
    let conn = open_db(&state)?;
    let project = projects::get(&conn, &id)?;
    projects::repair_workspace(&project)?;
    Ok(project)
}

#[tauri::command]
pub fn project_rename(state: State<'_, AppState>, id: String, title: String) -> AppResult<Project> {
    let conn = open_db(&state)?;
    projects::rename(&conn, &id, &title)
}

#[tauri::command]
pub fn project_set_status(
    state: State<'_, AppState>,
    id: String,
    status: String,
) -> AppResult<Project> {
    let conn = open_db(&state)?;
    projects::set_status(&conn, &id, &status)
}

/// Hard delete. Requires explicit confirmation in the UI (DESIGN.md section 8).
#[tauri::command]
pub fn project_delete(state: State<'_, AppState>, id: String) -> AppResult<bool> {
    let conn = open_db(&state)?;
    projects::delete(&conn, &id)
}

fn workspace_info(state: &State<'_, AppState>) -> WorkspaceInfo {
    let persisted = workspace_config::load(&state.config_path);
    WorkspaceInfo {
        root: current_workspace_root(state).to_string_lossy().into_owned(),
        default_root: state
            .default_workspace_root
            .to_string_lossy()
            .into_owned(),
        customized: persisted.workspace_root.is_some(),
    }
}

#[tauri::command]
pub fn workspace_get(state: State<'_, AppState>) -> AppResult<WorkspaceInfo> {
    Ok(workspace_info(&state))
}

/// Changes the workspace root for NEW projects. Existing projects keep their
/// recorded `workspace_path`; the UI communicates this.
#[tauri::command]
pub fn workspace_set_root(state: State<'_, AppState>, path: String) -> AppResult<WorkspaceInfo> {
    let root = workspace_config::validate_root(&path)?;
    let config = workspace_config::WorkspaceConfigFile {
        workspace_root: Some(root.to_string_lossy().into_owned()),
    };
    workspace_config::save(&state.config_path, &config)?;
    *state.workspace_root.lock().unwrap() = root;
    Ok(workspace_info(&state))
}
