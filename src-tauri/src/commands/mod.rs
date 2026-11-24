use std::collections::HashMap;
use std::fs;
use std::path::Path;

use serde::Serialize;
use tauri::ipc::Channel;
use tauri::Manager;

use crate::metadata::{extract_metadata, ScannedTrack};
use crate::scanner::{walk_library, DiscoveredFile, KnownFile};

/// Events streamed back to the frontend during a scan.
#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data")]
pub enum ScanEvent {
    Log {
        level: String,
        message: String,
    },
    Tracks {
        tracks: Vec<ScannedTrack>,
    },
    Progress {
        scanned: u32,
        total: u32,
    },
    Complete {
        total: u32,
        new_tracks: u32,
        skipped: u32,
    },
}

/// Result of fetch_cover_art.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoverResult {
    pub artist: String,
    pub album: String,
    pub cover_path: Option<String>,
}

#[tauri::command]
pub async fn scan_library(
    app: tauri::AppHandle,
    dir: String,
    known_files: Vec<KnownFile>,
    on_event: Channel<ScanEvent>,
) -> Result<(), String> {
    let dir_clone = dir.clone();
    let dir_path = Path::new(&dir_clone);
    if !dir_path.is_dir() {
        return Err(format!("Not a valid directory: {}", dir));
    }

    // Prepare covers directory.
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Cannot get cache dir: {}", e))?;
    let covers_dir = cache_dir.join("covers");
    fs::create_dir_all(&covers_dir)
        .map_err(|e| format!("Cannot create covers dir: {}", e))?;

    let known_map: HashMap<String, (i64, i64)> = known_files
        .into_iter()
        .map(|f| (f.path, (f.mtime, f.size)))
        .collect();

    // Run the blocking scan on a dedicated thread.
    let on_event_clone = on_event.clone();
    tokio::task::spawn_blocking(move || {
        let dir_path = Path::new(&dir);

        let _ = on_event_clone.send(ScanEvent::Log {
            level: "INFO".into(),
            message: format!("Scanning {}", dir),
        });

        // Walk directory.
        let (files, skipped, warnings) = walk_library(dir_path, &known_map);

        for warn in &warnings {
            let _ = on_event_clone.send(ScanEvent::Log {
                level: "WARN".into(),
                message: warn.clone(),
            });
        }

        let _ = on_event_clone.send(ScanEvent::Log {
            level: "INFO".into(),
            message: format!(
                "Found {} new files, {} unchanged",
                files.len(),
                skipped
            ),
        });

        let total = files.len() as u32;
        let mut scanned: u32 = 0;
        let mut batch: Vec<ScannedTrack> = Vec::with_capacity(50);

        for file in &files {
            match extract_metadata(file, &covers_dir) {
                Ok(track) => {
                    batch.push(track);
                }
                Err(e) => {
                    let _ = on_event_clone.send(ScanEvent::Log {
                        level: "WARN".into(),
                        message: e,
                    });
                }
            }

            scanned += 1;

            // Flush batch every 50 tracks.
            if batch.len() >= 50 {
                let _ = on_event_clone.send(ScanEvent::Tracks {
                    tracks: batch.clone(),
                });
                batch.clear();
                let _ = on_event_clone.send(ScanEvent::Progress { scanned, total });
            }
        }

        // Flush remaining.
        if !batch.is_empty() {
            let _ = on_event_clone.send(ScanEvent::Tracks {
                tracks: batch,
            });
        }

        let _ = on_event_clone.send(ScanEvent::Progress {
            scanned: total,
            total,
        });

        let _ = on_event_clone.send(ScanEvent::Complete {
            total,
            new_tracks: scanned,
            skipped,
        });

        let _ = on_event_clone.send(ScanEvent::Log {
            level: "INFO".into(),
            message: format!("Scan complete: {} tracks processed", scanned),
        });
    })
    .await
    .map_err(|e| format!("Scan task failed: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn scan_file(
    app: tauri::AppHandle,
    path: String,
) -> Result<ScannedTrack, String> {
    let file_path = Path::new(&path);
    if !file_path.is_file() {
        return Err(format!("Not a valid file: {}", path));
    }

    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Cannot get cache dir: {}", e))?;
    let covers_dir = cache_dir.join("covers");
    fs::create_dir_all(&covers_dir)
        .map_err(|e| format!("Cannot create covers dir: {}", e))?;

    let metadata = fs::metadata(file_path)
        .map_err(|e| format!("Cannot stat {}: {}", path, e))?;

    let mtime = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let size = metadata.len() as i64;

    let discovered = DiscoveredFile {
        path: file_path.to_path_buf(),
        mtime,
        size,
    };

    extract_metadata(&discovered, &covers_dir)
}

#[tauri::command]
pub async fn fetch_cover_art(
    app: tauri::AppHandle,
    artist: String,
    album: String,
    on_event: Channel<ScanEvent>,
) -> Result<CoverResult, String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Cannot get cache dir: {}", e))?;
    let covers_dir = cache_dir.join("covers");
    fs::create_dir_all(&covers_dir)
        .map_err(|e| format!("Cannot create covers dir: {}", e))?;

    let hash = {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut h = DefaultHasher::new();
        format!("{}:{}", artist, album).hash(&mut h);
        format!("{:016x}", h.finish())
    };
    let dest = covers_dir.join(format!("{}.jpg", hash));

    // Already cached?
    if dest.exists() {
        return Ok(CoverResult {
            artist,
            album,
            cover_path: Some(dest.to_string_lossy().to_string()),
        });
    }

    // 1. Try iTunes Search API.
    let _ = on_event.send(ScanEvent::Log {
        level: "FETCH".into(),
        message: format!("Searching iTunes for cover: {} - {}", artist, album),
    });

    let client = reqwest::Client::builder()
        .user_agent("Orphetune/0.1 (https://github.com/Hozaifah47/Orphetune)")
        .build()
        .map_err(|e| e.to_string())?;

    if let Ok(cover) = try_itunes(&client, &artist, &album, &dest).await {
        if cover {
            let _ = on_event.send(ScanEvent::Log {
                level: "FETCH".into(),
                message: format!("iTunes cover found for {} - {}", artist, album),
            });
            return Ok(CoverResult {
                artist,
                album,
                cover_path: Some(dest.to_string_lossy().to_string()),
            });
        }
    }

    // 2. Try MusicBrainz + Cover Art Archive (rate-limited: 1 req/s).
    let _ = on_event.send(ScanEvent::Log {
        level: "FETCH".into(),
        message: format!("Searching MusicBrainz for cover: {} - {}", artist, album),
    });
    tokio::time::sleep(std::time::Duration::from_secs(1)).await;

    if let Ok(cover) = try_musicbrainz(&client, &artist, &album, &dest).await {
        if cover {
            let _ = on_event.send(ScanEvent::Log {
                level: "FETCH".into(),
                message: format!("MusicBrainz cover found for {} - {}", artist, album),
            });
            return Ok(CoverResult {
                artist,
                album,
                cover_path: Some(dest.to_string_lossy().to_string()),
            });
        }
    }

    let _ = on_event.send(ScanEvent::Log {
        level: "INFO".into(),
        message: format!("No cover found for {} - {}", artist, album),
    });

    Ok(CoverResult {
        artist,
        album,
        cover_path: None,
    })
}

async fn try_itunes(
    client: &reqwest::Client,
    artist: &str,
    album: &str,
    dest: &Path,
) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
    let query = format!("{} {}", artist, album);
    let url = format!(
        "https://itunes.apple.com/search?term={}&media=music&entity=album&limit=1",
        urlencoding_encode(&query)
    );

    let resp: serde_json::Value = client.get(&url).send().await?.json().await?;

    if let Some(artwork_url) = resp["results"]
        .as_array()
        .and_then(|r| r.first())
        .and_then(|r| r["artworkUrl100"].as_str())
    {
        // Get higher resolution (600x600).
        let hi_res = artwork_url.replace("100x100bb", "600x600bb");
        let img_bytes = client.get(&hi_res).send().await?.bytes().await?;
        fs::write(dest, &img_bytes)?;
        return Ok(true);
    }

    Ok(false)
}

async fn try_musicbrainz(
    client: &reqwest::Client,
    artist: &str,
    album: &str,
    dest: &Path,
) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
    let query = format!(
        "https://musicbrainz.org/ws/2/release/?query=artist:{}+release:{}&fmt=json&limit=1",
        urlencoding_encode(artist),
        urlencoding_encode(album)
    );

    let resp: serde_json::Value = client.get(&query).send().await?.json().await?;

    if let Some(mbid) = resp["releases"]
        .as_array()
        .and_then(|r| r.first())
        .and_then(|r| r["id"].as_str())
    {
        // Rate limit before Cover Art Archive request.
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;

        let caa_url = format!("https://coverartarchive.org/release/{}/front", mbid);
        let img_resp = client.get(&caa_url).send().await?;
        if img_resp.status().is_success() {
            let img_bytes = img_resp.bytes().await?;
            fs::write(dest, &img_bytes)?;
            return Ok(true);
        }
    }

    Ok(false)
}

/// Simple percent-encoding for URL query parameters.
fn urlencoding_encode(s: &str) -> String {
    let mut result = String::with_capacity(s.len() * 3);
    for byte in s.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                result.push(byte as char);
            }
            _ => {
                result.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    result
}

#[tauri::command]
pub async fn get_ytdlp_version(app: tauri::AppHandle) -> Result<String, String> {
    crate::sidecar::get_ytdlp_version(&app).await
}

#[tauri::command]
pub async fn search_web_tracks(
    app: tauri::AppHandle,
    query: String,
) -> Result<Vec<crate::sidecar::WebSearchResult>, String> {
    crate::sidecar::search_web(&app, &query).await
}

#[tauri::command]
pub async fn download_track(
    app: tauri::AppHandle,
    video_id: String,
    dest_dir: String,
    on_event: Channel<crate::sidecar::DownloadEvent>,
) -> Result<ScannedTrack, String> {
    crate::sidecar::download_track(app, video_id, dest_dir, on_event).await
}

#[tauri::command]
pub async fn cancel_download(
    app: tauri::AppHandle,
    video_id: String,
) -> Result<bool, String> {
    let dm = app.state::<crate::sidecar::DownloadManager>();
    Ok(dm.cancel(&video_id))
}
