//! Workspace root configuration (`config.json` in the app data directory).
//!
//! The workspace root is where project folders live. The default resolves to
//! the user's Documents directory via Tauri's platform APIs (never a
//! hard-coded profile path) and falls back to the app data directory when
//! Documents is unavailable. The persisted file overrides the default.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WorkspaceConfigFile {
    #[serde(default)]
    pub workspace_root: Option<String>,
}

/// Reads the persisted config; a missing or empty file means "use the default".
pub fn load(config_path: &Path) -> WorkspaceConfigFile {
    std::fs::read_to_string(config_path)
        .ok()
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default()
}

/// Persists the config atomically (temp file + rename in the same directory).
pub fn save(config_path: &Path, config: &WorkspaceConfigFile) -> AppResult<()> {
    let temp = config_path.with_extension(format!(
        "json.tmp-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos()
    ));
    std::fs::write(&temp, serde_json::to_string_pretty(config)?)?;
    match std::fs::rename(&temp, config_path) {
        Ok(()) => Ok(()),
        Err(error) => {
            let _ = std::fs::remove_file(&temp);
            Err(AppError::Io(error.to_string()))
        }
    }
}

/// Validates a user-provided workspace root: must be absolute and creatable.
/// Returns the canonical path with the verbatim `\\?\` prefix stripped.
pub fn validate_root(raw: &str) -> AppResult<PathBuf> {
    let path = PathBuf::from(raw.trim());
    if !path.is_absolute() {
        return Err(AppError::Validation(
            "workspace root must be an absolute path".into(),
        ));
    }
    std::fs::create_dir_all(&path)?;
    let canonical = path
        .canonicalize()
        .map_err(|error| AppError::Io(format!("workspace root: {error}")))?;
    let raw = canonical.to_string_lossy();
    if let Some(stripped) = raw.strip_prefix(r"\\?\") {
        Ok(PathBuf::from(stripped.to_string()))
    } else {
        Ok(canonical)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn save_and_load_round_trip() {
        let dir = std::env::temp_dir().join(format!(
            "adps-config-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        let config_path = dir.join("config.json");

        let config = WorkspaceConfigFile {
            workspace_root: Some("C:\\some\\root".into()),
        };
        save(&config_path, &config).unwrap();

        let loaded = load(&config_path);
        assert_eq!(loaded.workspace_root.as_deref(), Some("C:\\some\\root"));

        // Saving again must replace the previous file cleanly.
        let second = WorkspaceConfigFile { workspace_root: None };
        save(&config_path, &second).unwrap();
        assert!(load(&config_path).workspace_root.is_none());

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn missing_config_uses_default() {
        let missing = std::env::temp_dir().join("adps-config-missing-does-not-exist");
        let loaded = load(&missing);
        assert!(loaded.workspace_root.is_none());
    }

    #[test]
    fn validate_root_rejects_relative_paths() {
        let error = validate_root("relative/path").unwrap_err();
        assert!(matches!(error, AppError::Validation(_)));
    }
}
