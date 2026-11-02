//! Files arriving from the OS (argv, second instance, drag and drop). Rust filters them by
//! extension and authorizes them; the frontend only receives paths that are already trusted.

use crate::state::AppState;
use serde_json::json;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, Manager};

use super::authz::is_markdown;

/// Splits raw command-line args into (markdown files, rejected files). Flags are ignored;
/// relative paths resolve against `cwd`.
pub fn partition_args(args: &[String], cwd: &Path) -> (Vec<PathBuf>, Vec<PathBuf>) {
    let (mut ok, mut bad) = (Vec::new(), Vec::new());
    for a in args.iter().filter(|a| !a.starts_with('-')) {
        let p = PathBuf::from(a);
        let p = if p.is_absolute() { p } else { cwd.join(p) };
        if is_markdown(&p) {
            ok.push(p)
        } else {
            bad.push(p)
        }
    }
    (ok, bad)
}

/// Authorizes and forwards the paths to the frontend.
pub fn dispatch_open(app: &AppHandle, paths: Vec<PathBuf>, source: &str) {
    let state = app.state::<AppState>();
    let (mut accepted, mut rejected) = (Vec::new(), Vec::new());
    for p in paths {
        match state.authorized.authorize(&p) {
            Ok(c) => accepted.push(c),
            Err(_) => rejected.push(p),
        }
    }
    if !accepted.is_empty() {
        let _ = app.emit("app://open-files", json!({ "paths": accepted, "source": source }));
    }
    if !rejected.is_empty() {
        let _ = app.emit("app://rejected-files", json!({ "paths": rejected, "reason": "NOT_MARKDOWN" }));
    }
}

/// Files passed on the command line of the first launch; the frontend drains them on startup.
pub fn collect_launch_files(app: &AppHandle) {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let cwd = std::env::current_dir().unwrap_or_default();
    let (ok, _) = partition_args(&args, &cwd);
    let state = app.state::<AppState>();
    let mut launch = state.launch_files.lock().unwrap();
    for p in ok {
        if let Ok(c) = state.authorized.authorize(&p) {
            launch.push(c);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn partitions_args_by_extension_and_skips_flags() {
        let cwd = Path::new("C:\\work");
        let args: Vec<String> =
            ["--flag", "a.md", "C:\\x\\b.MARKDOWN", "c.txt"].iter().map(|s| s.to_string()).collect();
        let (ok, bad) = partition_args(&args, cwd);
        assert_eq!(ok, vec![cwd.join("a.md"), PathBuf::from("C:\\x\\b.MARKDOWN")]);
        assert_eq!(bad, vec![cwd.join("c.txt")]);
    }
}
