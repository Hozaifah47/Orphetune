use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LyricsResult {
    pub synced: Option<String>,
    pub plain: Option<String>,
    pub instrumental: bool,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct LrclibResponse {
    pub instrumental: Option<bool>,
    pub plain_lyrics: Option<String>,
    pub synced_lyrics: Option<String>,
    pub duration: Option<f64>,
}

const USER_AGENT: &str = "Orphetune/0.1 (https://github.com/Hozaifah47/Orphetune)";

/// Fetch lyrics from LRCLIB.
/// First attempts GET https://lrclib.net/api/get.
/// On 404, falls back to GET https://lrclib.net/api/search and picks the closest duration match (within 2s).
pub async fn fetch_lyrics(
    artist: &str,
    title: &str,
    album: &str,
    duration_s: f64,
) -> Result<LyricsResult, String> {
    let client = reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // 1. Try GET /api/get
    let get_url = "https://lrclib.net/api/get";
    let mut req = client
        .get(get_url)
        .query(&[("artist_name", artist), ("track_name", title)]);

    if !album.is_empty() && album != "Unknown Album" {
        req = req.query(&[("album_name", album)]);
    }

    if duration_s > 0.0 {
        req = req.query(&[("duration", &format!("{:.0}", duration_s))]);
    }

    let resp = req.send().await;

    if let Ok(res) = resp {
        if res.status().is_success() {
            if let Ok(data) = res.json::<LrclibResponse>().await {
                return Ok(LyricsResult {
                    synced: data.synced_lyrics,
                    plain: data.plain_lyrics,
                    instrumental: data.instrumental.unwrap_or(false),
                });
            }
        }
    }

    // 2. Fallback to GET /api/search
    let search_url = "https://lrclib.net/api/search";
    let query_str = format!("{} {}", artist, title);
    let search_res = client
        .get(search_url)
        .query(&[("q", &query_str)])
        .send()
        .await
        .map_err(|e| format!("LRCLIB search request failed: {}", e))?;

    if search_res.status().is_success() {
        if let Ok(items) = search_res.json::<Vec<LrclibResponse>>().await {
            // Find closest duration match within 2.0 seconds
            let mut closest: Option<LrclibResponse> = None;
            let mut min_diff = f64::MAX;

            for item in items {
                if let Some(dur) = item.duration {
                    let diff = (dur - duration_s).abs();
                    if diff <= 2.0 && diff < min_diff {
                        min_diff = diff;
                        closest = Some(item);
                    }
                } else if closest.is_none() {
                    closest = Some(item);
                }
            }

            if let Some(best) = closest {
                return Ok(LyricsResult {
                    synced: best.synced_lyrics,
                    plain: best.plain_lyrics,
                    instrumental: best.instrumental.unwrap_or(false),
                });
            }
        }
    }

    // No match found
    Ok(LyricsResult {
        synced: None,
        plain: None,
        instrumental: false,
    })
}
