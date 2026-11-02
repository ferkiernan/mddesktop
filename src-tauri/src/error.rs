//! Error contract shared with the frontend (`AppError` in data-model.md).

use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    NotAuthorized,
    NotFound,
    PermissionDenied,
    InvalidArgument,
    NotMarkdown,
    TooLarge,
    EncodingUndetectable,
    EncodingConversionRequired,
    ExternalConflict,
    DiskFull,
    Io,
}

#[derive(Debug, Clone, Serialize, thiserror::Error)]
#[error("{code:?}: {message}")]
pub struct AppError {
    pub code: ErrorCode,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<Value>,
}

pub type AppResult<T> = Result<T, AppError>;

impl AppError {
    pub fn new(code: ErrorCode, message: impl Into<String>) -> Self {
        Self { code, message: message.into(), details: None }
    }

    pub fn with_details(mut self, details: Value) -> Self {
        self.details = Some(details);
        self
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        use std::io::ErrorKind::*;
        let code = match e.kind() {
            NotFound => ErrorCode::NotFound,
            PermissionDenied => ErrorCode::PermissionDenied,
            StorageFull => ErrorCode::DiskFull,
            _ => ErrorCode::Io,
        };
        Self::new(code, e.to_string())
    }
}
