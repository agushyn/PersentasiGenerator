//! Phase 2: project persistence and workspace management.
//!
//! Responsibilities:
//! - SQLite repository for the `projects` table (migration 0002).
//! - Per-project workspace folders under a configurable workspace root
//!   (TECHNICAL_SPEC.md section 5.2).
//! - Atomic `project.json` metadata writes (temp file + rename in the same
//!   directory, which is atomic on Windows).
//! - Recovery: missing workspace folders are recreated; a missing
//!   `project.json` is rewritten from the database row.
//!
//! Ordering rule for destructive operations: the filesystem is touched first;
//! only after it succeeds does the database row change, so file errors can
//! never corrupt database records.

use std::path::{Path, PathBuf};

use rusqlite::Connection;
use serde::{Deserialize, Serialize};

use crate::db::utc_now;
use crate::error::{AppError, AppResult};

/// Workspace folders created for every project (TECHNICAL_SPEC.md 5.2).
const PROJECT_SUBFOLDERS: &[&str] = &[
    "sources/original",
    "sources/extracted",
    "research",
    "learning",
    "storyboard",
    "design",
    "assets",
    "slides",
    "render",
    "exports",
    "reports",
];

pub const STATUS_ACTIVE: &str = "active";
pub const STATUS_ARCHIVED: &str = "archived";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub title: String,
    pub topic: Option<String>,
    pub audience: Option<String>,
    pub language: Option<String>,
    pub duration_minutes: Option<i64>,
    pub status: String,
    pub workspace_path: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NewProject {
    pub title: String,
    pub topic: Option<String>,
    pub audience: Option<String>,
    pub language: Option<String>,
    pub duration_minutes: Option<i64>,
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

fn validate_title(title: &str) -> AppResult<String> {
    let title = title.trim();
    if title.is_empty() {
        return Err(AppError::Validation("title must not be empty".into()));
    }
    if title.chars().count() > 200 {
        return Err(AppError::Validation(
            "title must be at most 200 characters".into(),
        ));
    }
    Ok(title.to_string())
}

fn validate_optional_text(value: &Option<String>, field: &str) -> AppResult<Option<String>> {
    match value {
        Some(text) => {
            let text = text.trim();
            if text.is_empty() {
                return Ok(None);
            }
            if text.chars().count() > 200 {
                return Err(AppError::Validation(format!(
                    "{field} must be at most 200 characters"
                )));
            }
            Ok(Some(text.to_string()))
        }
        None => Ok(None),
    }
}

fn validate_duration(value: &Option<i64>) -> AppResult<Option<i64>> {
    match value {
        Some(minutes) => {
            if !(1..=600).contains(minutes) {
                return Err(AppError::Validation(
                    "duration_minutes must be between 1 and 600".into(),
                ));
            }
            Ok(Some(*minutes))
        }
        None => Ok(None),
    }
}

/// Project ids are generated here, but the format is enforced defensively so
/// it can never carry path traversal segments.
fn validate_id(id: &str) -> AppResult<()> {
    let valid = id.len() == 36
        && id
            .chars()
            .all(|c| c.is_ascii_hexdigit() || c == '-');
    if valid {
        Ok(())
    } else {
        Err(AppError::Validation("invalid project id".into()))
    }
}

// ---------------------------------------------------------------------------
// Workspace layout
// ---------------------------------------------------------------------------

/// Creates every standard folder inside `project_dir` (idempotent).
fn ensure_layout(project_dir: &Path) -> AppResult<()> {
    for folder in PROJECT_SUBFOLDERS {
        std::fs::create_dir_all(project_dir.join(folder))?;
    }
    Ok(())
}

/// Writes `project.json` atomically: temp file in the same directory, then a
/// rename over the target (Windows `fs::rename` replaces existing files).
fn write_project_json(project_dir: &Path, project: &Project) -> AppResult<()> {
    let payload = serde_json::json!({
        "schema_version": "1.0",
        "id": project.id,
        "title": project.title,
        "topic": project.topic,
        "audience": project.audience,
        "language": project.language,
        "duration_minutes": project.duration_minutes,
        "status": project.status,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    });
    let target = project_dir.join("project.json");
    let temp = project_dir.join(format!(
        ".project.json.tmp-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos()
    ));
    std::fs::write(&temp, serde_json::to_string_pretty(&payload)?)?;
    match std::fs::rename(&temp, &target) {
        Ok(()) => Ok(()),
        Err(error) => {
            let _ = std::fs::remove_file(&temp);
            Err(error.into())
        }
    }
}

/// Recreates missing folders and a missing `project.json` from the row data.
pub fn repair_workspace(project: &Project) -> AppResult<()> {
    let dir = PathBuf::from(&project.workspace_path);
    std::fs::create_dir_all(&dir)?;
    ensure_layout(&dir)?;
    if !dir.join("project.json").exists() {
        write_project_json(&dir, project)?;
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

fn row_to_project(row: &rusqlite::Row<'_>) -> rusqlite::Result<Project> {
    Ok(Project {
        id: row.get(0)?,
        title: row.get(1)?,
        topic: row.get(2)?,
        audience: row.get(3)?,
        language: row.get(4)?,
        duration_minutes: row.get(5)?,
        status: row.get(6)?,
        workspace_path: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

const SELECT_COLUMNS: &str =
    "id, title, topic, audience, language, duration_minutes, status, workspace_path, created_at, updated_at";

pub fn list(conn: &Connection) -> AppResult<Vec<Project>> {
    let sql = format!("SELECT {SELECT_COLUMNS} FROM projects ORDER BY updated_at DESC");
    let mut statement = conn.prepare(&sql)?;
    let rows = statement.query_map([], row_to_project)?;
    let mut projects = Vec::new();
    for row in rows {
        projects.push(row?);
    }
    Ok(projects)
}

pub fn get(conn: &Connection, id: &str) -> AppResult<Project> {
    validate_id(id)?;
    let sql = format!("SELECT {SELECT_COLUMNS} FROM projects WHERE id = ?1");
    conn.query_row(&sql, [id], row_to_project)
        .map_err(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => AppError::ProjectNotFound {
                id: id.to_string(),
            },
            other => AppError::Db(other.to_string()),
        })
}

/// Canonicalizes the root so the stored path is absolute and normalized.
/// `canonicalize` returns a Windows verbatim path (`\\?\C:\...`); the prefix
/// is stripped so stored/displayed paths stay user-friendly.
fn canonical_root(workspace_root: &Path) -> AppResult<PathBuf> {
    let canonical = workspace_root
        .canonicalize()
        .map_err(|error| AppError::Io(format!("workspace root: {error}")))?;
    let raw = canonical.to_string_lossy();
    if let Some(stripped) = raw.strip_prefix(r"\\?\") {
        Ok(PathBuf::from(stripped.to_string()))
    } else {
        Ok(canonical)
    }
}

/// Creates the project row and its workspace folder in that order: if the
/// filesystem fails, the row is rolled back so no orphan record remains.
pub fn create(conn: &Connection, workspace_root: &Path, new: &NewProject) -> AppResult<Project> {
    let title = validate_title(&new.title)?;
    let topic = validate_optional_text(&new.topic, "topic")?;
    let audience = validate_optional_text(&new.audience, "audience")?;
    let language = validate_optional_text(&new.language, "language")?;
    let duration_minutes = validate_duration(&new.duration_minutes)?;

    let root = canonical_root(workspace_root)?;
    let id = uuid::Uuid::new_v4().to_string();
    let project_dir = root.join(&id);

    std::fs::create_dir_all(&project_dir)?;
    if let Err(error) = ensure_layout(&project_dir) {
        // Roll the partial folder back so no half-initialized workspace stays.
        let _ = std::fs::remove_dir_all(&project_dir);
        return Err(error.into());
    }

    let now = utc_now();
    let project = Project {
        id: id.clone(),
        title,
        topic,
        audience,
        language,
        duration_minutes,
        status: STATUS_ACTIVE.to_string(),
        workspace_path: project_dir.to_string_lossy().into_owned(),
        created_at: now.clone(),
        updated_at: now.clone(),
    };

    let insert_result = conn.execute(
        "INSERT INTO projects (id, title, topic, audience, language, duration_minutes, status, workspace_path, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            project.id,
            project.title,
            project.topic,
            project.audience,
            project.language,
            project.duration_minutes,
            project.status,
            project.workspace_path,
            project.created_at,
            project.updated_at,
        ],
    );

    if let Err(error) = insert_result {
        // Filesystem side effects are undone; the database never keeps a row
        // whose workspace could not be created.
        let _ = std::fs::remove_dir_all(&project_dir);
        return Err(AppError::Db(error.to_string()));
    }

    if let Err(error) = write_project_json(&project_dir, &project) {
        let _ = conn.execute("DELETE FROM projects WHERE id = ?1", [&id]);
        let _ = std::fs::remove_dir_all(&project_dir);
        return Err(error);
    }

    Ok(project)
}

/// Updates the title and rewrites `project.json` to match.
pub fn rename(conn: &Connection, id: &str, title: &str) -> AppResult<Project> {
    validate_id(id)?;
    let title = validate_title(title)?;
    let existing = get(conn, id)?;
    let updated_at = utc_now();
    conn.execute(
        "UPDATE projects SET title = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![title, updated_at, id],
    )?;
    let project = Project { title, updated_at, ..existing };
    write_project_json(Path::new(&project.workspace_path), &project)?;
    Ok(project)
}

/// Updates the status ('active' | 'archived') and rewrites `project.json`.
pub fn set_status(conn: &Connection, id: &str, status: &str) -> AppResult<Project> {
    validate_id(id)?;
    if status != STATUS_ACTIVE && status != STATUS_ARCHIVED {
        return Err(AppError::Validation(
            "status must be 'active' or 'archived'".into(),
        ));
    }
    let existing = get(conn, id)?;
    if existing.status == status {
        return Ok(existing);
    }
    let updated_at = utc_now();
    conn.execute(
        "UPDATE projects SET status = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![status, updated_at, id],
    )?;
    let project = Project {
        status: status.to_string(),
        updated_at,
        ..existing
    };
    write_project_json(Path::new(&project.workspace_path), &project)?;
    Ok(project)
}

/// Deletes a project: workspace folder first, then the row. If the folder is
/// already gone the row is still removed, so a manual folder deletion does
/// not leave an undeletable record.
pub fn delete(conn: &Connection, id: &str) -> AppResult<bool> {
    validate_id(id)?;
    let project = match conn
        .query_row(
            &format!("SELECT {SELECT_COLUMNS} FROM projects WHERE id = ?1"),
            [id],
            row_to_project,
        )
        .map(Some)
        .or_else(|error| match error {
            rusqlite::Error::QueryReturnedNoRows => Ok(None),
            other => Err(AppError::Db(other.to_string())),
        })? {
        Some(project) => project,
        None => return Ok(false),
    };

    let dir = PathBuf::from(&project.workspace_path);
    if dir.exists() {
        std::fs::remove_dir_all(&dir)?;
    }

    let changed = conn.execute("DELETE FROM projects WHERE id = ?1", [id])?;
    Ok(changed > 0)
}

// ---------------------------------------------------------------------------
// Workspace root handling
// ---------------------------------------------------------------------------

/// Creates the workspace root (and parent chain) if needed and returns the
/// canonical path (verbatim `\\?\` prefix stripped).
pub fn ensure_workspace_root(root: &Path) -> AppResult<PathBuf> {
    std::fs::create_dir_all(root)?;
    canonical_root(root)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    fn temp_dir(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "adps-projects-{}-{}-{tag}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn sample_new(title: &str) -> NewProject {
        NewProject {
            title: title.to_string(),
            topic: Some("Photosynthesis".into()),
            audience: Some("Grade 7".into()),
            language: Some("id".into()),
            duration_minutes: Some(30),
        }
    }

    #[test]
    fn create_builds_workspace_and_metadata() {
        let temp = temp_dir("create");
        let root = ensure_workspace_root(&temp.join("workspace")).unwrap();
        let conn = db::open(&temp.join("test.db")).unwrap();
        db::run_migrations(&conn).unwrap();

        let project = create(&conn, &root, &sample_new("Sel Tumbuhan")).unwrap();

        let dir = PathBuf::from(&project.workspace_path);
        assert!(dir.starts_with(&root));
        // No verbatim path prefix may leak into stored paths.
        assert!(!project.workspace_path.starts_with(r"\\?\"));
        assert!(dir.join("project.json").exists());
        assert!(dir.join("sources/original").is_dir());
        assert!(dir.join("slides").is_dir());
        assert!(dir.join("reports").is_dir());
        assert_eq!(project.status, "active");
        assert_eq!(project.title, "Sel Tumbuhan");

        // The metadata file mirrors the row.
        let raw = std::fs::read_to_string(dir.join("project.json")).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(parsed["id"], project.id.as_str());
        assert_eq!(parsed["schema_version"], "1.0");

        let _ = std::fs::remove_dir_all(&temp);
    }

    #[test]
    fn list_orders_by_updated_at_desc() {
        let temp = temp_dir("list");
        let root = ensure_workspace_root(&temp.join("workspace")).unwrap();
        let conn = db::open(&temp.join("test.db")).unwrap();
        db::run_migrations(&conn).unwrap();

        let first = create(&conn, &root, &sample_new("First")).unwrap();
        let second = create(&conn, &root, &sample_new("Second")).unwrap();
        // Touch the first project so it becomes the most recently updated.
        rename(&conn, &first.id, "First updated").unwrap();

        let projects = list(&conn).unwrap();
        assert_eq!(projects.len(), 2);
        assert_eq!(projects[0].id, first.id);
        assert_eq!(projects[0].title, "First updated");
        assert_eq!(projects[1].id, second.id);

        let _ = std::fs::remove_dir_all(&temp);
    }

    #[test]
    fn rename_updates_row_and_metadata() {
        let temp = temp_dir("rename");
        let root = ensure_workspace_root(&temp.join("workspace")).unwrap();
        let conn = db::open(&temp.join("test.db")).unwrap();
        db::run_migrations(&conn).unwrap();

        let project = create(&conn, &root, &sample_new("Old title")).unwrap();
        let renamed = rename(&conn, &project.id, "New title").unwrap();
        assert_eq!(renamed.title, "New title");
        assert!(renamed.updated_at >= project.updated_at);

        let raw = std::fs::read_to_string(
            PathBuf::from(&project.workspace_path).join("project.json"),
        )
        .unwrap();
        assert!(raw.contains("New title"));
        assert!(!raw.contains("Old title"));

        let _ = std::fs::remove_dir_all(&temp);
    }

    #[test]
    fn archive_and_restore_rewrite_metadata() {
        let temp = temp_dir("status");
        let root = ensure_workspace_root(&temp.join("workspace")).unwrap();
        let conn = db::open(&temp.join("test.db")).unwrap();
        db::run_migrations(&conn).unwrap();

        let project = create(&conn, &root, &sample_new("Archivable")).unwrap();
        let archived = set_status(&conn, &project.id, STATUS_ARCHIVED).unwrap();
        assert_eq!(archived.status, "archived");
        assert!(
            std::fs::read_to_string(
                PathBuf::from(&project.workspace_path).join("project.json")
            )
            .unwrap()
            .contains("\"status\": \"archived\"")
        );
        let restored = set_status(&conn, &project.id, STATUS_ACTIVE).unwrap();
        assert_eq!(restored.status, "active");

        // Setting the same status again is a no-op that still succeeds.
        let unchanged = set_status(&conn, &project.id, STATUS_ACTIVE).unwrap();
        assert_eq!(unchanged.status, "active");

        let _ = std::fs::remove_dir_all(&temp);
    }

    #[test]
    fn delete_removes_workspace_then_row() {
        let temp = temp_dir("delete");
        let root = ensure_workspace_root(&temp.join("workspace")).unwrap();
        let conn = db::open(&temp.join("test.db")).unwrap();
        db::run_migrations(&conn).unwrap();

        let project = create(&conn, &root, &sample_new("Doomed")).unwrap();
        let dir = PathBuf::from(&project.workspace_path);

        assert!(delete(&conn, &project.id).unwrap());
        assert!(!dir.exists());
        assert!(get(&conn, &project.id).is_err());
        assert!(!delete(&conn, &project.id).unwrap());

        let _ = std::fs::remove_dir_all(&temp);
    }

    #[test]
    fn delete_succeeds_when_folder_already_gone() {
        let temp = temp_dir("delete-missing");
        let root = ensure_workspace_root(&temp.join("workspace")).unwrap();
        let conn = db::open(&temp.join("test.db")).unwrap();
        db::run_migrations(&conn).unwrap();

        let project = create(&conn, &root, &sample_new("Vanished")).unwrap();
        std::fs::remove_dir_all(PathBuf::from(&project.workspace_path)).unwrap();

        assert!(delete(&conn, &project.id).unwrap());
        assert!(get(&conn, &project.id).is_err());

        let _ = std::fs::remove_dir_all(&temp);
    }

    #[test]
    fn failed_title_validation_creates_nothing() {
        let temp = temp_dir("validation");
        let root = ensure_workspace_root(&temp.join("workspace")).unwrap();
        let conn = db::open(&temp.join("test.db")).unwrap();
        db::run_migrations(&conn).unwrap();

        let error = create(&conn, &root, &sample_new("   ")).unwrap_err();
        assert!(matches!(error, AppError::Validation(_)));
        assert!(list(&conn).unwrap().is_empty());

        let long_title = "x".repeat(201);
        let error = create(&conn, &root, &sample_new(&long_title)).unwrap_err();
        assert!(matches!(error, AppError::Validation(_)));

        let mut bad = sample_new("Bad duration");
        bad.duration_minutes = Some(0);
        let error = create(&conn, &root, &bad).unwrap_err();
        assert!(matches!(error, AppError::Validation(_)));

        let _ = std::fs::remove_dir_all(&temp);
    }

    #[test]
    fn repair_recreates_missing_folders_and_metadata() {
        let temp = temp_dir("repair");
        let root = ensure_workspace_root(&temp.join("workspace")).unwrap();
        let conn = db::open(&temp.join("test.db")).unwrap();
        db::run_migrations(&conn).unwrap();

        let project = create(&conn, &root, &sample_new("Broken")).unwrap();
        let dir = PathBuf::from(&project.workspace_path);

        // Simulate damage: folders and metadata deleted manually.
        std::fs::remove_file(dir.join("project.json")).unwrap();
        std::fs::remove_dir_all(dir.join("sources")).unwrap();

        repair_workspace(&project).unwrap();

        assert!(dir.join("project.json").exists());
        assert!(dir.join("sources/original").is_dir());
        assert!(dir.join("sources/extracted").is_dir());

        let _ = std::fs::remove_dir_all(&temp);
    }

    #[test]
    fn projects_persist_across_connections() {
        let temp = temp_dir("persist");
        let root = ensure_workspace_root(&temp.join("workspace")).unwrap();
        let db_path = temp.join("test.db");
        {
            let conn = db::open(&db_path).unwrap();
            db::run_migrations(&conn).unwrap();
            create(&conn, &root, &sample_new("Survivor")).unwrap();
        }
        {
            let conn = db::open(&db_path).unwrap();
            db::run_migrations(&conn).unwrap();
            let projects = list(&conn).unwrap();
            assert_eq!(projects.len(), 1);
            assert_eq!(projects[0].title, "Survivor");
            assert!(PathBuf::from(&projects[0].workspace_path).exists());
        }
        let _ = std::fs::remove_dir_all(&temp);
    }

    #[test]
    fn migration_version_2_applies_idempotently() {
        let temp = temp_dir("migrations");
        let conn = db::open(&temp.join("test.db")).unwrap();
        let first = db::run_migrations(&conn).unwrap();
        assert_eq!(first, vec![1, 2]);
        let second = db::run_migrations(&conn).unwrap();
        assert!(second.is_empty());

        // The status constraint rejects unknown values.
        let error = conn
            .execute(
                "INSERT INTO projects (id, title, status, workspace_path, created_at, updated_at)
                 VALUES ('x', 'x', 'weird', 'x', 'x', 'x')",
                [],
            )
            .unwrap_err();
        assert!(error.to_string().contains("CHECK"));

        let _ = std::fs::remove_dir_all(&temp);
    }
}
