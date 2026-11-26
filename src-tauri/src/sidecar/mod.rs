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
    Log {
        level: String,
        message: String,
    },
    Progress {
        percent: f32,
    },
    Transfer {
        percent: Option<f32>,
        bytes: Option<u64>,
        total: Option<u64>,
        speed: Option<f64>,
        eta: Option<u64>,
    },
    Verifying,
    Complete {
        track: ScannedTrack,
    },
    Error {
        message: String,
    },
}

/// Active download cancel handles
#[derive(Default)]
pub struct DownloadManager {
    cancels: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

impl DownloadManager {
    pub fn register(&self, id: &str) -> Result<Arc<AtomicBool>, String> {
        let flag = Arc::new(AtomicBool::new(false));
        let mut map = self.cancels.lock().unwrap();
        if map.contains_key(id) {
            return Err("Download already active.".into());
        }
        map.insert(id.to_string(), Arc::clone(&flag));
        Ok(flag)
    }

    pub fn cancel(&self, id: &str) -> bool {
        let map = self.cancels.lock().unwrap();
        if let Some(flag) = map.get(id) {
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

struct Registration<'a> {
    manager: &'a DownloadManager,
    id: &'a str,
}
impl Drop for Registration<'_> {
    fn drop(&mut self) {
        self.manager.unregister(self.id);
    }
}

/// Resolve paths to sidecar binaries: yt-dlp and ffmpeg
fn resolve_sidecar_path(name: &str) -> Result<PathBuf, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let bin = exe
        .parent()
        .ok_or("Application directory unavailable")?
        .join(format!("{name}{}", std::env::consts::EXE_SUFFIX));
    if bin.is_file() {
        Ok(bin)
    } else {
        Err(format!("Bundled {name} is missing."))
    }
}

/// Get yt-dlp version string
pub async fn get_ytdlp_version(_app: &tauri::AppHandle) -> Result<String, String> {
    let ytdlp_path = resolve_sidecar_path("yt-dlp")?;
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
    _app: &tauri::AppHandle,
    query: &str,
) -> Result<Vec<WebSearchResult>, String> {
    let ytdlp_path = resolve_sidecar_path("yt-dlp")?;
    if query.trim().is_empty() || query.len() > 512 {
        return Err("Enter a search up to 512 bytes.".into());
    }
    let search_arg = if let Ok(url) = reqwest::Url::parse(query.trim()) {
        if url.scheme() != "https"
            || !matches!(
                url.host_str(),
                Some("youtube.com" | "www.youtube.com" | "music.youtube.com")
            )
            || !matches!(url.path(), "/playlist" | "/watch")
        {
            return Err("Enter a search or a YouTube album or playlist URL.".into());
        }
        let list = url
            .query_pairs()
            .find(|(k, _)| k == "list")
            .map(|(_, v)| v)
            .ok_or("The URL is missing a playlist ID.")?;
        if list.is_empty()
            || !list
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_'))
        {
            return Err("Invalid playlist ID.".into());
        }
        format!("https://www.youtube.com/playlist?list={list}")
    } else {
        format!("ytsearch10:{}", query)
    };

    let output = Command::new(&ytdlp_path)
        .args([
            "--ignore-config",
            "--flat-playlist",
            "--dump-json",
            "--",
            &search_arg,
        ])
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

fn transfer_event(line: &str) -> Option<DownloadEvent> {
    let fields: Vec<_> = line
        .strip_prefix("orphetune-transfer:")?
        .split('|')
        .collect();
    let [percent, bytes, total, estimate, speed, eta] = fields.as_slice() else {
        return None;
    };
    Some(DownloadEvent::Transfer {
        percent: percent
            .trim()
            .trim_end_matches('%')
            .parse()
            .ok()
            .filter(|v| (0.0..=100.0).contains(v)),
        bytes: bytes.parse().ok(),
        total: total.parse().ok().or_else(|| estimate.parse().ok()),
        speed: speed
            .parse::<f64>()
            .ok()
            .filter(|n| n.is_finite() && *n >= 0.0),
        eta: eta.parse().ok(),
    })
}

fn download_percent(line: &str) -> Option<f32> {
    let value = line
        .strip_prefix("orphetune-progress:")?
        .trim()
        .strip_suffix('%')?
        .trim()
        .parse::<f32>()
        .ok()?;
    (0.0..=100.0).contains(&value).then_some(value)
}

#[test]
fn parses_only_measured_download_percentages() {
    assert_eq!(download_percent("orphetune-progress: 25.7%"), Some(25.7));
    for line in [
        "unknown",
        "orphetune-progress: NA",
        "orphetune-progress: NaN%",
        "orphetune-progress: 110%",
    ] {
        assert_eq!(download_percent(line), None);
    }
}

fn video_url(video_id: &str) -> Result<String, String> {
    if video_id.len() != 11
        || !video_id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_'))
    {
        return Err("Invalid video identifier.".into());
    }
    Ok(format!("https://www.youtube.com/watch?v={video_id}"))
}

#[derive(Serialize, Deserialize)]
pub struct SourceSelection {
    id: String,
    ext: String,
}

impl SourceSelection {
    fn selector(&self) -> Result<String, String> {
        if self.id.is_empty()
            || self.id.len() > 64
            || !self
                .id
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_'))
            || !matches!(
                self.ext.as_str(),
                "mp3" | "m4a" | "flac" | "ogg" | "opus" | "wav" | "aiff" | "aif"
            )
        {
            return Err("Unsupported source format.".into());
        }
        Ok(format!(
            "bestaudio[format_id={}][ext={}][vcodec=none]",
            self.id, self.ext
        ))
    }
}

#[derive(Serialize, Deserialize)]
pub struct SourceFormat {
    #[serde(rename = "format_id")]
    id: String,
    ext: String,
    acodec: String,
    vcodec: String,
    abr: Option<f64>,
    asr: Option<f64>,
    audio_channels: Option<u32>,
    filesize: Option<u64>,
    filesize_approx: Option<u64>,
    has_drm: Option<bool>,
}

#[tauri::command]
pub async fn source_formats(video_id: String) -> Result<Vec<SourceFormat>, String> {
    let url = video_url(&video_id)?;
    let output = Command::new(resolve_sidecar_path("yt-dlp")?)
        .args([
            "--ignore-config",
            "--no-playlist",
            "--dump-single-json",
            "--",
            &url,
        ])
        .kill_on_drop(true)
        .output()
        .await
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err("Could not retrieve formats from YouTube. Try again.".into());
    }
    let info: serde_json::Value =
        serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())?;
    Ok(info["formats"]
        .as_array()
        .into_iter()
        .flatten()
        .rev()
        .filter_map(|value| serde_json::from_value::<SourceFormat>(value.clone()).ok())
        .filter(|f| {
            f.vcodec == "none"
                && !matches!(f.acodec.as_str(), "none" | "unknown" | "")
                && f.has_drm != Some(true)
                && (SourceSelection {
                    id: f.id.clone(),
                    ext: f.ext.clone(),
                })
                .selector()
                .is_ok()
        })
        .collect())
}

pub async fn download_track(
    app: tauri::AppHandle,
    video_id: String,
    dest_dir: String,
    source: Option<SourceSelection>,
    on_event: Channel<DownloadEvent>,
) -> Result<ScannedTrack, String> {
    let dest_path = crate::library_access::authorize(&app, std::path::Path::new(&dest_dir), true)?;
    let video_url = video_url(&video_id)?;
    let ytdlp_path = resolve_sidecar_path("yt-dlp")?;
    let ffmpeg_path = resolve_sidecar_path("ffmpeg")?;

    let dm = app.state::<DownloadManager>();
    let cancel_flag = dm.register(&video_id)?;
    let _registration = Registration {
        manager: &dm,
        id: &video_id,
    };

    let _ = on_event.send(DownloadEvent::Log {
        level: "FETCH".into(),
        message: format!("Initiating download for video id: {}", video_id),
    });

    let staging = tempfile::Builder::new()
        .prefix(".orphetune-transfer-")
        .tempdir_in(&dest_path)
        .map_err(|e| format!("Cannot create transfer directory: {e}"))?;
    let mut cmd = Command::new(&ytdlp_path);
    #[cfg(unix)]
    cmd.process_group(0);
    cmd.arg("--paths")
        .arg(format!("temp:{}", staging.path().display()));
    cmd.arg("--paths")
        .arg(format!("home:{}", dest_path.display()));
    let template = if let Some(source) = &source {
        cmd.args(["-f", &source.selector()?]);
        format!("%(title).100s (source {}) [%(id)s].%(ext)s", source.id)
    } else {
        cmd.args([
            "-x",
            "--audio-format",
            "mp3",
            "--audio-quality",
            "0",
            "--sponsorblock-remove",
            "sponsor,selfpromo,music_offtopic",
            "--embed-metadata",
            "--embed-thumbnail",
        ]);
        "%(title).100s [%(id)s].%(ext)s".into()
    };
    cmd.current_dir(&dest_path).kill_on_drop(true).args([
        "--ignore-config",
        "--no-overwrites",
        "--no-playlist",
        "--ffmpeg-location",
        &ffmpeg_path.to_string_lossy(),
        "--newline",
        "--color",
        "never",
        "--progress",
        "--no-simulate",
        "--print",
        "after_move:orphetune-file:%(filepath)j",
        "--progress-template",
        "download:orphetune-transfer:%(progress._percent_str)s|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s",
        "-o",
        &template,
        &video_url,
    ]);

    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn yt-dlp download: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let mut reader = BufReader::new(stdout).lines();

    let stderr = child
        .stderr
        .take()
        .ok_or("Failed to capture download errors")?;
    let errors = tokio::spawn(async move {
        let mut errors = BufReader::new(stderr).lines();
        let mut last = String::new();
        while let Ok(Some(line)) = errors.next_line().await {
            if !line.trim().is_empty() {
                last = line.chars().take(512).collect();
            }
        }
        last
    });
    let mut downloaded_path: Option<PathBuf> = None;
    let mut cancellation = tokio::time::interval(std::time::Duration::from_millis(200));
    let mut stdout_open = true;
    let status = loop {
        tokio::select! {
            line_res = reader.next_line(), if stdout_open => {
                match line_res {
                    Ok(Some(line)) => {
                        let line = line.trim();
                        if let Some(event) = transfer_event(line) {
                            let _ = on_event.send(event);
                        } else if let Some(percent) = download_percent(line) {
                            let _ = on_event.send(DownloadEvent::Progress { percent });
                        } else if let Some(json) = line.strip_prefix("orphetune-file:") {
                            downloaded_path = serde_json::from_str(json).ok();
                        } else if !line.is_empty() {
                            let _ = on_event.send(DownloadEvent::Log {
                                level: "FETCH".into(),
                                message: line.to_string(),
                            });
                        }
                    }
                    Ok(None) => stdout_open = false,
                    Err(e) => {
                        let _ = on_event.send(DownloadEvent::Log {
                            level: "WARN".into(),
                            message: format!("Error reading download output: {}", e),
                        });
                        stdout_open = false;
                    }
                }
            }
            result = child.wait(), if !stdout_open => {
                break result.map_err(|e| format!("Failed waiting for yt-dlp: {e}"))?;
            }
            _ = cancellation.tick() => {
                if cancel_flag.load(Ordering::SeqCst) {
                    #[cfg(unix)]
                    if let Some(pid) = child.id() {
                        // The child leads its own process group, including FFmpeg.
                        unsafe { libc::kill(-(pid as i32), libc::SIGKILL) };
                    }
                    #[cfg(windows)]
                    if let Some(pid) = child.id() {
                        let _ = Command::new("taskkill.exe").args(["/T", "/F", "/PID", &pid.to_string()]).output().await;
                    }
                    let _ = child.kill().await;
                    let _ = on_event.send(DownloadEvent::Log {
                        level: "WARN".into(),
                        message: format!("Download cancelled for video {}", video_id),
                    });
                    return Err("Download cancelled by user".into());
                }
            }
        }
    };

    if !status.success() {
        let detail = errors.await.unwrap_or_default();
        let msg = if detail.is_empty() {
            format!("Download failed ({status})")
        } else {
            detail
        };
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

    let _ = on_event.send(DownloadEvent::Verifying);
    let file_path = downloaded_path.ok_or("yt-dlp did not report the completed audio path.")?;
    if !file_path
        .extension()
        .is_some_and(|ext| ext.eq_ignore_ascii_case(source.as_ref().map_or("mp3", |s| &s.ext)))
    {
        return Err("The downloaded file has an unexpected format.".into());
    }

    // Ingest the downloaded track using scan_file logic
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Cannot get cache dir: {}", e))?;
    let covers_dir = cache_dir.join("covers");
    let _ = std::fs::create_dir_all(&covers_dir);

    let file_path = crate::library_access::authorize(&app, &dest_path.join(file_path), false)?;
    let metadata = std::fs::metadata(&file_path)
        .map_err(|e| format!("Cannot stat {}: {}", file_path.display(), e))?;

    let mtime = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_micros() as i64)
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
