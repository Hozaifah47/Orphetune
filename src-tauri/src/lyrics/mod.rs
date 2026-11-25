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
    artist_name: String,
    track_name: String,
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
        .timeout(std::time::Duration::from_secs(10))
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

    let response = req.send().await.map_err(|e| e.to_string())?;
    if response.status() != reqwest::StatusCode::NOT_FOUND {
        let data = response
            .error_for_status()
            .map_err(|e| e.to_string())?
            .json::<LrclibResponse>()
            .await
            .map_err(|e| e.to_string())?;
        return Ok(LyricsResult {
            synced: data.synced_lyrics,
            plain: data.plain_lyrics,
            instrumental: data.instrumental.unwrap_or(false),
        });
    }

    // 2. Fallback to GET /api/search
    let search_url = "https://lrclib.net/api/search";
    let mut segments = title.split(['|', '｜']).map(str::trim);
    let first = segments.next().unwrap_or(title);
    let song = first.strip_suffix(" with lyrics").unwrap_or(first);
    let identities: Vec<_> = std::iter::once(artist)
        .chain(segments)
        .map(normalize)
        .collect();
    let search_res = client
        .get(search_url)
        .query(&[(
            "track_name",
            song.split_once(" (").map_or(song, |(base, _)| base),
        )])
        .send()
        .await
        .map_err(|e| format!("LRCLIB search request failed: {}", e))?;

    let items = search_res
        .error_for_status()
        .map_err(|e| e.to_string())?
        .json::<Vec<LrclibResponse>>()
        .await
        .map_err(|e| e.to_string())?;
    let expected = normalize(song);
    let mut matches: Vec<_> = items
        .into_iter()
        .filter_map(|item| {
            let performer = normalize(
                item.artist_name
                    .strip_suffix(" - Topic")
                    .unwrap_or(&item.artist_name),
            );
            if performer.is_empty()
                || !identities.contains(&performer)
                || normalize(&item.track_name) != expected
            {
                return None;
            }
            let difference = (item.duration? - duration_s).abs();
            Some((difference, item))
        })
        .collect();
    matches.sort_by(|(a, x), (b, y)| {
        a.total_cmp(b)
            .then_with(|| y.synced_lyrics.is_some().cmp(&x.synced_lyrics.is_some()))
    });
    for (difference, item) in matches {
        if difference <= 2.0
            && (item.synced_lyrics.is_some()
                || item.plain_lyrics.is_some()
                || item.instrumental == Some(true))
        {
            return Ok(LyricsResult {
                synced: item.synced_lyrics,
                plain: item.plain_lyrics,
                instrumental: item.instrumental.unwrap_or(false),
            });
        }
        if difference <= duration_s * 0.1 && item.plain_lyrics.is_some() {
            return Ok(LyricsResult {
                synced: None,
                plain: item.plain_lyrics,
                instrumental: false,
            });
        }
    }

    // No match found
    Ok(LyricsResult {
        synced: None,
        plain: None,
        instrumental: false,
    })
}

fn normalize(name: &str) -> String {
    name.to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore = "requires live LRCLIB access"]
    async fn matches_downloads_with_uploader_metadata() {
        let timed = fetch_lyrics("Saregama Ghazal", "Yeh Dil Ye Pagal Dil Mera (Awargi) | Shaam-E-Ghazal | Ghulam Ali | Mohsin Naqvi | Romantic Ghazal", "", 418.536).await.unwrap();
        assert!(timed.synced.is_some());
        let jagjit = fetch_lyrics("Saregama Music", "Kal Chaudhvin Ki Raat Thi with lyrics | कल चौदहवीं की रात थी | Jagjit Singh | Duniya Jise Kahte Hain", "", 391.128).await.unwrap();
        assert!(jagjit.plain.is_some() || jagjit.synced.is_some());
    }
}
