use serde::Serialize;

/// Structured error for IPC responses. Serialized as `{ code, message }`
/// so the frontend can act on stable error codes instead of strings.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("database error: {0}")]
    Db(String),

    #[error("io error: {0}")]
    Io(String),

    #[error("credential store error: {0}")]
    Credential(String),

    #[error("{code}: {message}")]
    Sidecar { code: String, message: String },

    #[error("validation error: {0}")]
    Validation(String),

    #[error("project not found: {id}")]
    ProjectNotFound { id: String },
}

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            AppError::Db(_) => "DB_ERROR",
            AppError::Io(_) => "IO_ERROR",
            AppError::Credential(_) => "CREDENTIAL_ERROR",
            AppError::Sidecar { code, .. } => match code.as_str() {
                "PPTX_GENERATION_FAILED" => "PPTX_GENERATION_FAILED",
                "SLIDE_SPEC_INVALID" => "SLIDE_SPEC_INVALID",
                "SIDECAR_NOT_FOUND" => "SIDECAR_NOT_FOUND",
                "SIDECAR_TIMEOUT" => "SIDECAR_TIMEOUT",
                "SIDECAR_UNREACHABLE" => "SIDECAR_UNREACHABLE",
                _ => "SIDECAR_FAILED",
            },
            AppError::Validation(_) => "VALIDATION_ERROR",
            AppError::ProjectNotFound { .. } => "PROJECT_NOT_FOUND",
        }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("AppError", 2)?;
        state.serialize_field("code", self.code())?;
        state.serialize_field("message", &self.to_string())?;
        state.end()
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(value: rusqlite::Error) -> Self {
        AppError::Db(value.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(value: serde_json::Error) -> Self {
        AppError::Io(value.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(value: std::io::Error) -> Self {
        AppError::Io(value.to_string())
    }
}

impl From<keyring::Error> for AppError {
    fn from(value: keyring::Error) -> Self {
        AppError::Credential(value.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
