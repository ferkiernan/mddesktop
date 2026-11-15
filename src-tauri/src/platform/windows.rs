use std::path::{Path, PathBuf};

/// `canonicalize` returns `\?\C:\...`; the rest of the app (dialogs, session, tab titles) uses `C:\...`.
/// UNC verbatim paths (`\?\UNC\server\share`) are kept as they are.
pub fn display_path(p: PathBuf) -> PathBuf {
    let s = p.to_string_lossy();
    match s.strip_prefix(r"\?\") {
        Some(rest) if !rest.starts_with("UNC\\") => PathBuf::from(rest),
        _ => p,
    }
}

/// NTFS paths are case-insensitive: `C:\Docs\A.md` and `c:\docs\a.md` are the same file.
pub fn path_key(p: &Path) -> String {
    p.to_string_lossy().to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_verbatim_prefix_but_keeps_unc() {
        assert_eq!(display_path(PathBuf::from(r"\?\C:\a\b.md")), PathBuf::from(r"C:\a\b.md"));
        assert_eq!(display_path(PathBuf::from(r"\?\UNC\srv\share\x.md")), PathBuf::from(r"\?\UNC\srv\share\x.md"));
        assert_eq!(display_path(PathBuf::from(r"C:\plain.md")), PathBuf::from(r"C:\plain.md"));
    }

    #[test]
    fn keys_are_case_insensitive() {
        assert_eq!(path_key(Path::new(r"C:\Docs\A.md")), path_key(Path::new(r"c:\docs\a.MD")));
    }
}

/// Opens an https URL in the default browser (Explorer hands it to the registered handler).
/// Only called with fixed URLs from the About dialog; no shell is involved.
pub fn open_url(url: &str) -> std::io::Result<()> {
    std::process::Command::new("explorer.exe").arg(url).spawn().map(|_| ())
}
