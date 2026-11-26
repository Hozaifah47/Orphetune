use std::{
    fs::File,
    os::fd::AsRawFd,
    path::PathBuf,
    sync::{Arc, Mutex},
};

use axum::{
    body::Body,
    extract::{Path, Request, State},
    http::{header, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use tokio::{net::TcpListener, sync::OnceCell};
use tower_http::services::ServeFile;
use uuid::Uuid;

#[derive(Clone)]
struct Track {
    token: String,
    file: Arc<File>,
    mime: HeaderValue,
}

#[derive(Default)]
pub struct LinuxAudio {
    port: OnceCell<u16>,
    track: Arc<Mutex<Option<Track>>>,
}

impl LinuxAudio {
    pub async fn url(&self, file: PathBuf) -> Result<String, String> {
        let mime = crate::scanner::audio_mime(&file).ok_or("Unsupported audio file")?;
        let opened = File::open(&file).map_err(|e| e.to_string())?;
        let fd_path = format!("/proc/self/fd/{}", opened.as_raw_fd());
        if std::fs::read_link(fd_path).map_err(|e| e.to_string())? != file
            || !opened.metadata().map_err(|e| e.to_string())?.is_file()
        {
            return Err("The track moved before playback started".into());
        }
        let port = self
            .port
            .get_or_try_init(|| async {
                let listener = TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, 0)).await?;
                let port = listener.local_addr()?.port();
                let router = Router::new()
                    .route("/{token}", get(stream))
                    .with_state(self.track.clone());
                tauri::async_runtime::spawn(async move {
                    if let Err(error) = axum::serve(listener, router).await {
                        eprintln!("Local audio service stopped: {error}");
                    }
                });
                Ok::<_, std::io::Error>(port)
            })
            .await
            .map_err(|e| e.to_string())?;
        let token = Uuid::new_v4().to_string();
        *self.track.lock().unwrap() = Some(Track {
            token: token.clone(),
            file: Arc::new(opened),
            mime: HeaderValue::from_static(mime),
        });
        Ok(format!("http://127.0.0.1:{port}/{token}"))
    }
}

async fn stream(
    State(active): State<Arc<Mutex<Option<Track>>>>,
    Path(token): Path<String>,
    req: Request,
) -> Response {
    let origin = req.headers().get(header::ORIGIN).cloned();
    if let Some(value) = &origin {
        let allowed = value == "tauri://localhost"
            || (cfg!(debug_assertions) && value == "http://localhost:1420");
        if !allowed {
            return StatusCode::FORBIDDEN.into_response();
        }
    }
    let track = active.lock().unwrap().clone();
    let Some(track) = track.filter(|t| t.token == token) else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let Ok(response) = ServeFile::new(format!("/proc/self/fd/{}", track.file.as_raw_fd()))
        .try_call(req)
        .await
    else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let mut response = response.map(Body::new);
    let headers = response.headers_mut();
    headers.insert(header::CONTENT_TYPE, track.mime);
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    if let Some(origin) = origin {
        headers.insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, origin);
    }
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn serves_only_the_selected_track_and_supports_seeking() {
        let file = std::env::temp_dir().join(format!("{}.wav", Uuid::new_v4()));
        std::fs::write(&file, b"test audio bytes").unwrap();
        let audio = LinuxAudio::default();
        let client = reqwest::Client::new();
        let url = audio.url(file.clone()).await.unwrap();
        let response = client
            .get(&url)
            .header("Range", "bytes=5-9")
            .header("Origin", "tauri://localhost")
            .send()
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::PARTIAL_CONTENT);
        assert_eq!(response.headers()["content-range"], "bytes 5-9/16");
        assert_eq!(
            response.headers()["access-control-allow-origin"],
            "tauri://localhost"
        );
        assert_eq!(response.bytes().await.unwrap().as_ref(), b"audio");
        assert_eq!(
            client
                .get(&url)
                .header("Origin", "https://example.org")
                .send()
                .await
                .unwrap()
                .status(),
            StatusCode::FORBIDDEN
        );
        let next = audio.url(file.clone()).await.unwrap();
        assert_ne!(url, next);
        assert_eq!(
            client.get(url).send().await.unwrap().status(),
            StatusCode::NOT_FOUND
        );
        std::fs::remove_file(&file).unwrap();
        std::fs::write(&file, b"replacement").unwrap();
        assert_eq!(
            client
                .get(next)
                .send()
                .await
                .unwrap()
                .bytes()
                .await
                .unwrap()
                .as_ref(),
            b"test audio bytes"
        );
        std::fs::remove_file(file).unwrap();
    }
}
