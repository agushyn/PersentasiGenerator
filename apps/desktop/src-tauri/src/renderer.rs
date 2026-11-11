//! Optional renderer (LibreOffice) detection.
//!
//! Rendering and PDF export are optional capabilities backed by an external
//! LibreOffice installation. Phase 0 only detects and reports; a missing
//! renderer is a documented limitation, never a silent failure.

use std::path::PathBuf;

/// Well-known Windows install locations for soffice.exe.
const COMMON_PATHS: &[&str] = &[
    r"C:\Program Files\LibreOffice\program\soffice.exe",
    r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
];

/// Searches PATH directories, then well-known install locations.
pub fn detect() -> Option<PathBuf> {
    if let Some(path_env) = std::env::var_os("PATH") {
        for dir in std::env::split_paths(&path_env) {
            let candidate = dir.join("soffice.exe");
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    for candidate in COMMON_PATHS {
        let path = PathBuf::from(candidate);
        if path.is_file() {
            return Some(path);
        }
    }
    None
}
