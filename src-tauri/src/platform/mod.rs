//! Platform-specific path rules (T092). Everything that depends on how the OS treats paths lives here so the
//! services stay portable: Windows strips `\?\` verbatim prefixes and compares paths case-insensitively.

#[cfg(windows)]
mod windows;
#[cfg(windows)]
pub use windows::{display_path, open_url, path_key};

/// Paths as returned by `canonicalize` are already in their display form outside Windows.
#[cfg(not(windows))]
pub fn display_path(p: std::path::PathBuf) -> std::path::PathBuf {
    p
}

/// Opens an https URL in the default browser.
#[cfg(not(windows))]
pub fn open_url(url: &str) -> std::io::Result<()> {
    let cmd = if cfg!(target_os = "macos") { "open" } else { "xdg-open" };
    std::process::Command::new(cmd).arg(url).spawn().map(|_| ())
}

/// Case-sensitive file systems: the path itself is the identity key.
#[cfg(not(windows))]
pub fn path_key(p: &std::path::Path) -> String {
    p.to_string_lossy().into_owned()
}
