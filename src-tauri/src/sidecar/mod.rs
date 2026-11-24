use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tauri::Manager;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

use crate::metadata::{extract_metadata, ScannedTrack};
use crate::scanner::DiscoveredFile;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WebSearchResult {
    pub id: String,
    pub title: String,
    pub uploader: String,
    pub duration: f64,
    pub thumbnail: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data")]
pub enum DownloadEvent {
    Log { level: String, message: String },
    Progress { percent: f32 },
    Complete { track: ScannedTrack },
    Error { message: String },
}

/// Active download cancel handles
pub struct DownloadManager {
    cancels: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

impl DownloadManager {
    pub fn new() -> Self {
        Self {
            cancels: Mutex::new(HashMap::new()),
        }
    }

    pub fn register(&self, id: &str) -> Arc<AtomicBool> {
        let flag = Arc::new(AtomicBool::new(false));
        let mut map = self.cancels.lock().unwrap();
        map.insert(id.to_string(), Arc::clone(&flag));
        flag
    }

    pub fn cancel(&self, id: &str) -> bool {
        let mut map = self.cancels.lock().unwrap();
        if let Some(flag) = map.remove(id) {
            flag.store(true, Ordering::SeqCst);
            true
        } else {
            false
        }
    }

    pub fn unregister(&self, id: &str) {
        let mut map = self.cancels.lock().unwrap();
        map.remove(id);
    }
}

/// Resolve paths to sidecar binaries: yt-dlp and ffmpeg
pub fn resolve_sidecar_path(app: &tauri::AppHandle, name: &str) -> Result<PathBuf, String> {
    let target = target_triple();
    let ext = if cfg!(windows) { ".exe" } else { "" };
    let filename = format!("{}-{}{}", name, target, ext);

    // 1. Check beside binary or in binaries/
    if let Ok(res_dir) = app.path().resource_dir() {
        let p = res_dir.join("binaries").join(&filename);
        if p.exists() {
            return Ok(p);
        }
    }

    // 2. Check current working dir src-tauri/binaries/
    let dev_path = PathBuf::from("src-tauri/binaries").join(&filename);
    if dev_path.exists() {
        return Ok(dev_path);
    }

    let bin_path = PathBuf::from("binaries").join(&filename);
    if bin_path.exists() {
        return Ok(bin_path);
    }

    // 3. Fallback: try relative to executable
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            let p = parent.join(&filename);
            if p.exists() {
                return Ok(p);
            }
            let p2 = parent.join("binaries").join(&filename);
            if p2.exists() {
                return Ok(p2);
            }
        }
    }

    // 4. Fallback to system PATH
    if let Some(path) = find_in_path(name) {
        return Ok(path);
    }

    Err(format!(
        "Sidecar {} not found. Expected in src-tauri/binaries/{}",
        name, filename
    ))
}

fn find_in_path(name: &str) -> Option<PathBuf> {
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in std::env::split_paths(&path_var) {
            let p = dir.join(name);
            if p.is_file() {
                return Some(p);
            }
        }
    }
    None
}

fn target_triple() -> &'static str {
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    return "x86_64-unknown-linux-gnu";
    #[cfg(all(target_os = "linux", target_arch = "aarch64"))]
    return "aarch64-unknown-linux-gnu";
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    return "x86_64-apple-darwin";
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    return "aarch64-apple-darwin";
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    return "x86_64-pc-windows-msvc";

    #[allow(unreachable_code)]
    "unknown"
}

/// Get yt-dlp version string
pub async fn get_ytdlp_version(app: &tauri::AppHandle) -> Result<String, String> {
    let ytdlp_path = resolve_sidecar_path(app, "yt-dlp")?;
    let output = Command::new(&ytdlp_path)
        .arg("--version")
        .output()
        .await
        .map_err(|e| format!("Failed to execute yt-dlp: {}", e))?;

    if output.status.success() {
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(version)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

/// Search web tracks using yt-dlp --dump-json --flat-playlist
pub async fn search_web(
    app: &tauri::AppHandle,
    query: &str,
) -> Result<Vec<WebSearchResult>, String> {
    let ytdlp_path = resolve_sidecar_path(app, "yt-dlp")?;
    let search_arg = format!("ytsearch10:{}", query);

    let output = Command::new(&ytdlp_path)
        .args(&[&search_arg, "--flat-playlist", "--dump-json"])
        .output()
        .await
        .map_err(|e| format!("Search process failed: {}", e))?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(format!("yt-dlp search error: {}", err_msg));
    }

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    let mut results = Vec::new();

    for line in stdout_str.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        if let Ok(v) = serde_json::from_str::<serde_json::Value>(line) {
            let id = v["id"].as_str().unwrap_or("").to_string();
            if id.is_empty() {
                continue;
            }
            let title = v["title"].as_str().unwrap_or("Untitled").to_string();
            let uploader = v["uploader"]
                .as_str()
                .or_else(|| v["channel"].as_str())
                .unwrap_or("Unknown Artist")
                .to_string();
            let duration = v["duration"].as_f64().unwrap_or(0.0);

            // Thumbnail extraction
            let thumbnail = v["thumbnail"].as_str().map(|s| s.to_string()).or_else(|| {
                v["thumbnails"]
                    .as_array()
                    .and_then(|arr| arr.last())
                    .and_then(|t| t["url"].as_str())
                    .map(|s| s.to_string())
            });

            results.push(WebSearchResult {
                id,
                title,
                uploader,
                duration,
                thumbnail,
            });
        }
    }

    Ok(results)
}

/// Download a video as mp3 using yt-dlp sidecar + ffmpeg sidecar
pub async fn download_track(
    app: tauri::AppHandle,
    video_id: String,
    dest_dir: String,
    on_event: Channel<DownloadEvent>,
) -> Result<ScannedTrack, String> {
    let dest_path = PathBuf::from(&dest_dir);
    if !dest_path.is_dir() {
        return Err(format!("Destination directory does not exist: {}", dest_dir));
    }

    let ytdlp_path = resolve_sidecar_path(&app, "yt-dlp")?;
    let ffmpeg_path = resolve_sidecar_path(&app, "ffmpeg")?;

    let dm = app.state::<DownloadManager>();
    let cancel_flag = dm.register(&video_id);

    let _ = on_event.send(DownloadEvent::Log {
        level: "FETCH".into(),
        message: format!("Initiating download for video id: {}", video_id),
    });

    // Output template: sanitized title or id
    let out_template = dest_path.join("%(title).100s [%(id)s].%(ext)s");
    let out_template_str = out_template.to_string_lossy().to_string();
    let video_url = format!("https://www.youtube.com/watch?v={}", video_id);

    let mut cmd = Command::new(&ytdlp_path);
    cmd.args(&[
        "-x",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0",
        "--embed-metadata",
        "--embed-thumbnail",
        "--ffmpeg-location",
        &ffmpeg_path.to_string_lossy(),
        "--newline",
        "--progress-template",
        "[download] %(progress._percent_str)s",
        "-o",
        &out_template_str,
        &video_url,
    ]);

    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn yt-dlp download: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let mut reader = BufReader::new(stdout).lines();

    loop {
        tokio::select! {
            line_res = reader.next_line() => {
                match line_res {
                    Ok(Some(line)) => {
                        let line = line.trim();
                        if line.starts_with("[download]") {
                            if let Some(pct_str) = line.strip_prefix("[download]") {
                                let cleaned = pct_str.replace('%', "").trim().to_string();
                                if let Ok(val) = cleaned.parse::<f32>() {
                                    let _ = on_event.send(DownloadEvent::Progress { percent: val });
                                }
                            }
                        } else if !line.is_empty() {
                            let _ = on_event.send(DownloadEvent::Log {
                                level: "FETCH".into(),
                                message: line.to_string(),
                            });
                        }
                    }
                    Ok(None) => break,
                    Err(e) => {
                        let _ = on_event.send(DownloadEvent::Log {
                            level: "WARN".into(),
                            message: format!("Error reading download output: {}", e),
                        });
                        break;
                    }
                }
            }
            _ = tokio::time::sleep(std::time::Duration::from_millis(200)) => {
                if cancel_flag.load(Ordering::SeqCst) {
                    let _ = child.kill().await;
                    dm.unregister(&video_id);
                    let _ = on_event.send(DownloadEvent::Log {
                        level: "WARN".into(),
                        message: format!("Download cancelled for video {}", video_id),
                    });
                    return Err("Download cancelled by user".into());
                }
            }
        }
    }

    let status = child
        .wait()
        .await
        .map_err(|e| format!("Failed waiting for yt-dlp child: {}", e))?;
    dm.unregister(&video_id);

    if !status.success() {
        let msg = format!("Download failed with status: {:?}", status.code());
        let _ = on_event.send(DownloadEvent::Error {
            message: msg.clone(),
        });
        return Err(msg);
    }

    let _ = on_event.send(DownloadEvent::Progress { percent: 100.0 });
    let _ = on_event.send(DownloadEvent::Log {
        level: "INFO".into(),
        message: format!("Download complete for {}. Scanning file...", video_id),
    });

    // Locate the downloaded .mp3 file
    let pattern = format!("[{}].mp3", video_id);
    let mut downloaded_path: Option<PathBuf> = None;

    if let Ok(entries) = std::fs::read_dir(&dest_path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
                if name.contains(&pattern) || name.ends_with(".mp3") && name.contains(&video_id) {
                    downloaded_path = Some(p);
                    break;
                }
            }
        }
    }

    let file_path = downloaded_path.ok_or_else(|| {
        format!(
            "Could not find downloaded .mp3 file for {} in {}",
            video_id, dest_dir
        )
    })?;

    // Ingest the downloaded track using scan_file logic
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Cannot get cache dir: {}", e))?;
    let covers_dir = cache_dir.join("covers");
    let _ = std::fs::create_dir_all(&covers_dir);

    let metadata = std::fs::metadata(&file_path)
        .map_err(|e| format!("Cannot stat {}: {}", file_path.display(), e))?;

    let mtime = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let size = metadata.len() as i64;

    let discovered = DiscoveredFile {
        path: file_path.clone(),
        mtime,
        size,
    };

    let track = extract_metadata(&discovered, &covers_dir)?;

    let _ = on_event.send(DownloadEvent::Complete {
        track: track.clone(),
    });

    let _ = on_event.send(DownloadEvent::Log {
        level: "INFO".into(),
        message: format!("Ingested: {} - {}", track.artist, track.title),
    });

    Ok(track)
}
