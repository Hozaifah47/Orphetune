use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::Path;

use lofty::config::ParseOptions;
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::picture::PictureType;
use lofty::probe::Probe;
use lofty::tag::Accessor;

use crate::scanner::DiscoveredFile;

/// A fully parsed track ready for the frontend to persist.
#[derive(serde::Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ScannedTrack {
    pub path: String,
    pub mtime: i64,
    pub size: i64,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub track_no: Option<u32>,
    pub duration_ms: u64,
    pub format: String,
    pub cover_path: Option<String>,
}

/// Extract metadata from a single discovered file.
/// `covers_dir` is the directory where extracted covers are saved.
pub fn extract_metadata(file: &DiscoveredFile, covers_dir: &Path) -> Result<ScannedTrack, String> {
    let path = &file.path;
    let path_str = path.to_string_lossy().to_string();

    let format = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("unknown")
        .to_lowercase();

    // Fallback title from filename (without extension).
    let filename_title = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Unknown")
        .to_string();

    let tagged_file = Probe::open(path)
        .map_err(|e| format!("Cannot open {}: {}", path_str, e))?
        .options(ParseOptions::new())
        .read()
        .map_err(|e| format!("Cannot parse {}: {}", path_str, e))?;

    let duration_ms = tagged_file.properties().duration().as_millis() as u64;

    let tag = tagged_file
        .primary_tag()
        .or_else(|| tagged_file.first_tag());

    let (title, artist, album, track_no, cover_path) = match tag {
        Some(tag) => {
            let title = tag
                .title()
                .map(|s| s.to_string())
                .unwrap_or_else(|| filename_title.clone());
            let artist = tag
                .artist()
                .map(|s| s.to_string())
                .unwrap_or_else(|| "Unknown Artist".to_string());
            let album = tag
                .album()
                .map(|s| s.to_string())
                .unwrap_or_else(|| "Unknown Album".to_string());
            let track_no = tag.track();

            // Try to extract embedded cover art.
            let cover_path = extract_cover(tag.pictures(), &artist, &album, path, covers_dir);

            (title, artist, album, track_no, cover_path)
        }
        None => (
            filename_title,
            "Unknown Artist".to_string(),
            "Unknown Album".to_string(),
            None,
            find_folder_cover(path, covers_dir),
        ),
    };

    Ok(ScannedTrack {
        path: path_str,
        mtime: file.mtime,
        size: file.size,
        title,
        artist,
        album,
        track_no,
        duration_ms,
        format,
        cover_path,
    })
}

/// Try embedded pictures first, then folder covers (folder.jpg, cover.jpg, front.jpg).
fn extract_cover(
    pictures: &[lofty::picture::Picture],
    artist: &str,
    album: &str,
    track_path: &Path,
    covers_dir: &Path,
) -> Option<String> {
    // Prefer CoverFront, then any picture.
    let pic = pictures
        .iter()
        .find(|p| p.pic_type() == PictureType::CoverFront)
        .or_else(|| pictures.first());

    if let Some(pic) = pic {
        let data = pic.data();
        if !data.is_empty() {
            let hash = make_hash(&format!("{}:{}", artist, album));
            let ext = mime_to_ext(pic.mime_type());
            let filename = format!("{}.{}", hash, ext);
            let dest = covers_dir.join(&filename);

            if !dest.exists() {
                if let Ok(()) = fs::write(&dest, data) {
                    return Some(dest.to_string_lossy().to_string());
                }
            } else {
                return Some(dest.to_string_lossy().to_string());
            }
        }
    }

    // Fall back to folder covers.
    find_folder_cover(track_path, covers_dir)
}

/// Look for cover.jpg, folder.jpg, front.jpg in the track's directory.
fn find_folder_cover(track_path: &Path, covers_dir: &Path) -> Option<String> {
    let parent = track_path.parent()?;
    let candidates = [
        "cover.jpg",
        "folder.jpg",
        "front.jpg",
        "cover.png",
        "folder.png",
    ];

    for name in &candidates {
        let candidate = parent.join(name);
        if candidate
            .symlink_metadata()
            .is_ok_and(|m| m.is_file() && m.len() <= 8 * 1024 * 1024)
        {
            // Copy to covers dir with a hash based on the folder path.
            let hash = make_hash(&parent.to_string_lossy());
            let ext = if name.ends_with(".png") { "png" } else { "jpg" };
            let dest = covers_dir.join(format!("{}.{}", hash, ext));

            if !dest.exists() {
                if let Ok(data) = fs::read(&candidate) {
                    if fs::write(&dest, &data).is_ok() {
                        return Some(dest.to_string_lossy().to_string());
                    }
                }
            } else {
                return Some(dest.to_string_lossy().to_string());
            }
        }
    }

    None
}

/// Create a 16-hex-char hash from a string.
fn make_hash(s: &str) -> String {
    let mut hasher = DefaultHasher::new();
    s.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

/// Convert lofty MimeType to file extension.
fn mime_to_ext(mime: Option<&lofty::picture::MimeType>) -> &'static str {
    match mime {
        Some(lofty::picture::MimeType::Png) => "png",
        Some(lofty::picture::MimeType::Bmp) => "bmp",
        Some(lofty::picture::MimeType::Gif) => "gif",
        Some(lofty::picture::MimeType::Tiff) => "tiff",
        _ => "jpg",
    }
}
