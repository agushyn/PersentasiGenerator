//! Node.js sidecar invocation (Phase 0 spike).
//!
//! The sidecar is a Tauri `externalBin`: the official Node.js runtime is
//! bundled next to the application executable, so end users never need to
//! install Node.js. Communication contract:
//!
//! - stdin:  one JSON manifest, closed with EOF
//! - stdout: exactly one JSON result line
//! - exit:   0 on success, 2 on failure
//!
//! The sidecar never receives API credentials. All input is a manifest the
//! Rust backend itself constructed; nothing here executes AI-generated code.

use std::io::Write;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

use serde::Deserialize;

use crate::error::{AppError, AppResult};

/// Hard timeout for the whole sidecar run. Phase 0 decks are tiny; a real
/// timeout protects the UI from a hung process.
const SIDECAR_TIMEOUT: Duration = Duration::from_secs(60);

/// Suppresses the console window that a spawned process would otherwise open.
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Debug, Deserialize)]
pub struct SidecarOutput {
    pub ok: bool,
    pub output_path: Option<String>,
    pub slide_count: Option<u32>,
    pub error_code: Option<String>,
    pub message: Option<String>,
}

/// Locates the bundled Node.js executable.
pub fn resolve_node_exe() -> Option<PathBuf> {
    const TRIPLE_EXE: &str = "node-x86_64-pc-windows-msvc.exe";
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            // Installed bundles strip the target triple from external binaries.
            let candidate = dir.join("node.exe");
            if candidate.is_file() {
                return Some(candidate);
            }
            // `tauri dev` keeps the full triple-suffixed name.
            let candidate = dir.join(TRIPLE_EXE);
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    // 2. Repository checkout fallback (source builds without `tauri dev`).
    let candidate = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("binaries")
        .join(TRIPLE_EXE);
    candidate.is_file().then_some(candidate)
}

/// Locates the bundled pptx-engine script.
pub fn resolve_engine_script() -> Option<PathBuf> {
    // 1. Bundled resource next to the executable (Windows install layout).
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let candidate = dir.join("pptx-engine").join("cli.cjs");
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    // 2. Repository checkout fallback (repo root is three levels up).
    let candidate = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../packages/pptx-engine/dist/cli.cjs");
    candidate.is_file().then_some(candidate)
}

/// Runs the sidecar with the given manifest JSON and returns its result.
pub fn generate(manifest_json: &str) -> AppResult<SidecarOutput> {
    let node = resolve_node_exe().ok_or_else(|| AppError::Sidecar {
        code: "SIDECAR_NOT_FOUND".into(),
        message: "bundled Node.js runtime not found next to the application".into(),
    })?;
    let script = resolve_engine_script().ok_or_else(|| AppError::Sidecar {
        code: "SIDECAR_NOT_FOUND".into(),
        message: "bundled pptx-engine script not found".into(),
    })?;

    let started = Instant::now();
    let mut child = Command::new(&node)
        .arg(&script)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|error| AppError::Sidecar {
            code: "SIDECAR_UNREACHABLE".into(),
            message: format!("failed to spawn sidecar: {error}"),
        })?;

    // Write the manifest, then drop stdin so the sidecar sees EOF.
    {
        let mut stdin = child
            .stdin
            .take()
            .ok_or_else(|| AppError::Sidecar {
                code: "SIDECAR_UNREACHABLE".into(),
                message: "sidecar stdin unavailable".into(),
            })?;
        stdin
            .write_all(manifest_json.as_bytes())
            .map_err(|error| AppError::Sidecar {
                code: "SIDECAR_UNREACHABLE".into(),
                message: format!("failed to write manifest: {error}"),
            })?;
        stdin.flush().ok();
    }

    // Drain stdout/stderr on helper threads so the child never blocks on a
    // full pipe while we enforce the timeout.
    let stdout_pipe = child.stdout.take();
    let stderr_pipe = child.stderr.take();
    let stdout_thread = std::thread::spawn(move || {
        stdout_pipe
            .map(|mut pipe| {
                let mut buffer = String::new();
                use std::io::Read;
                let _ = pipe.read_to_string(&mut buffer);
                buffer
            })
            .unwrap_or_default()
    });
    let stderr_thread = std::thread::spawn(move || {
        stderr_pipe
            .map(|mut pipe| {
                let mut buffer = String::new();
                use std::io::Read;
                let _ = pipe.read_to_string(&mut buffer);
                buffer
            })
            .unwrap_or_default()
    });

    let mut timed_out = false;
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break Some(status),
            Ok(None) => {
                if started.elapsed() > SIDECAR_TIMEOUT {
                    timed_out = true;
                    // Killing the child closes its pipes, ending the readers.
                    let _ = child.kill();
                    let _ = child.wait();
                    break None;
                }
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(error) => {
                return Err(AppError::Sidecar {
                    code: "SIDECAR_UNREACHABLE".into(),
                    message: format!("failed to wait for sidecar: {error}"),
                });
            }
        }
    };

    let stdout = stdout_thread.join().unwrap_or_default();
    let stderr = stderr_thread.join().unwrap_or_default();

    if timed_out || status.is_none() {
        return Err(AppError::Sidecar {
            code: "SIDECAR_TIMEOUT".into(),
            message: format!("sidecar exceeded the {} second timeout", SIDECAR_TIMEOUT.as_secs()),
        });
    }

    let exit_status = status.expect("checked above");
    if !exit_status.success() {
        // stdout may still carry a structured error; prefer it, fall back to
        // stderr. Diagnostics are truncated to keep IPC payloads small.
        let trimmed = stdout.trim();
        if !trimmed.is_empty() {
            if let Ok(output) = serde_json::from_str::<SidecarOutput>(trimmed) {
                if !output.ok {
                    return Err(AppError::Sidecar {
                        code: output.error_code.unwrap_or_else(|| "PPTX_GENERATION_FAILED".into()),
                        message: output.message.unwrap_or_else(|| "sidecar reported failure".into()),
                    });
                }
            }
        }
        let snippet: String = stderr.trim().chars().take(600).collect();
        return Err(AppError::Sidecar {
            code: "PPTX_GENERATION_FAILED".into(),
            message: format!("sidecar exited with {exit_status}; stderr: {snippet}"),
        });
    }

    let trimmed = stdout.trim();
    let output: SidecarOutput = serde_json::from_str(trimmed).map_err(|error| {
        AppError::Sidecar {
            code: "PPTX_GENERATION_FAILED".into(),
            message: format!("sidecar stdout was not the expected JSON contract: {error}"),
        }
    })?;

    if !output.ok {
        return Err(AppError::Sidecar {
            code: output.error_code.unwrap_or_else(|| "PPTX_GENERATION_FAILED".into()),
            message: output.message.unwrap_or_else(|| "sidecar reported failure".into()),
        });
    }

    // Trust nothing: verify the promised artifact actually exists.
    if let Some(path) = &output.output_path {
        verify_pptx_artifact(Path::new(path))?;
    } else {
        return Err(AppError::Sidecar {
            code: "PPTX_GENERATION_FAILED".into(),
            message: "sidecar did not report an output path".into(),
        });
    }

    Ok(output)
}

/// Confirms the generated PPTX exists, is non-empty, and carries the ZIP
/// magic bytes of an OOXML package.
fn verify_pptx_artifact(path: &Path) -> AppResult<()> {
    let metadata = std::fs::metadata(path).map_err(|error| AppError::Sidecar {
        code: "PPTX_GENERATION_FAILED".into(),
        message: format!("generated artifact missing: {error}"),
    })?;
    if metadata.len() == 0 {
        return Err(AppError::Sidecar {
            code: "PPTX_GENERATION_FAILED".into(),
            message: "generated artifact is empty".into(),
        });
    }
    let bytes = {
        use std::io::Read;
        std::fs::File::open(path)?
            .bytes()
            .take(4)
            .collect::<Result<Vec<u8>, _>>()?
    };
    if bytes != vec![0x50, 0x4B, 0x03, 0x04] {
        return Err(AppError::Sidecar {
            code: "PPTX_GENERATION_FAILED".into(),
            message: "generated artifact is not a ZIP/OOXML container".into(),
        });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolution_helpers_do_not_panic_and_report_presence() {
        // This documents whether the sidecar pieces are present in the test
        // environment; the report mirrors what the UI shows.
        let node = resolve_node_exe();
        let script = resolve_engine_script();
        println!("node exe: {:?}", node);
        println!("engine script: {:?}", script);
        // The repository fallbacks must resolve in a source checkout.
        assert!(script.is_some(), "bundled engine script missing");
        assert!(node.is_some(), "bundled Node runtime missing");
    }

    #[test]
    fn end_to_end_sidecar_generates_valid_pptx() {
        let temp = std::env::temp_dir().join(format!(
            "adps-sidecar-test-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ));
        std::fs::create_dir_all(&temp).unwrap();
        let output = temp.join("phase0-test.pptx");
        let manifest = serde_json::json!({
            "schema_version": "1.0",
            "output_path": output.to_string_lossy(),
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
                    "body": "This paragraph is a native PowerPoint text box, not a rasterized image."
                },
                {
                    "slide_id": "slide-003",
                    "slide_type": "editable-shapes",
                    "shapes": [
                        { "shape": "rect", "x": 0.8, "y": 1.2, "w": 4.6, "h": 2.4, "fill": "C65D3B", "text": "Editable rectangle" },
                        { "shape": "ellipse", "x": 6.0, "y": 1.2, "w": 4.6, "h": 2.4, "fill": "788477", "text": "Editable ellipse" }
                    ]
                }
            ]
        })
        .to_string();

        let result = generate(&manifest).expect("sidecar generation should succeed");
        assert!(result.ok);
        assert_eq!(result.slide_count, Some(3));
        assert!(output.is_file());
        assert!(std::fs::metadata(&output).unwrap().len() > 0);
        let _ = std::fs::remove_dir_all(temp);
    }
}
