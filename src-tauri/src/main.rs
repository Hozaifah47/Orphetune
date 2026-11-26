#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]
fn main() {
    #[cfg(unix)]
    if std::env::args_os().nth(1).as_deref() == Some(std::ffi::OsStr::new("--download-worker")) {
        std::process::exit(
            orphetune_lib::sidecar::run_download_worker().unwrap_or_else(|error| {
                eprintln!("{error}");
                1
            }),
        );
    }
    orphetune_lib::run();
}
