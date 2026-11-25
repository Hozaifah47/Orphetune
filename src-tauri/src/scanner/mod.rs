use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use walkdir::WalkDir;

/// Audio extensions we accept (lowercase).
const AUDIO_EXTENSIONS: &[&str] = &["mp3", "flac", "wav"];

pub fn is_audio(path: &Path) -> bool {
    path.extension()
        .and_then(|s| s.to_str())
        .is_some_and(|extension| {
            AUDIO_EXTENSIONS
                .iter()
                .any(|allowed| extension.eq_ignore_ascii_case(allowed))
        })
}

/// Represents a file the frontend already knows about.
#[derive(serde::Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct KnownFile {
    pub path: String,
    pub mtime: i64,
    pub size: i64,
}

/// A discovered audio file on disk (before metadata extraction).
#[derive(Debug, Clone)]
pub struct DiscoveredFile {
    pub path: PathBuf,
    pub mtime: i64,
    pub size: i64,
}

/// Walk `dir` recursively and return audio files, skipping known unchanged ones.
/// Returns `(discovered, skipped_count, warnings)`.
pub fn walk_library(
    dir: &Path,
    known: &HashMap<String, (i64, i64)>,
) -> (Vec<DiscoveredFile>, u32, Vec<String>) {
    let mut discovered: Vec<DiscoveredFile> = Vec::new();
    let mut skipped: u32 = 0;
    let mut warnings: Vec<String> = Vec::new();

    for entry in WalkDir::new(dir)
        .follow_links(false)
        .follow_root_links(false)
        .into_iter()
        .filter_entry(|e| {
            !(e.depth() > 0
                && e.file_type().is_dir()
                && e.file_name()
                    .to_string_lossy()
                    .starts_with(".orphetune-transfer-"))
        })
    {
        let entry = match entry {
            Ok(e) => e,
            Err(e) => {
                warnings.push(format!("Cannot read: {}", e));
                continue;
            }
        };

        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();
        if !is_audio(path) {
            continue;
        }

        let metadata = match fs::metadata(path) {
            Ok(m) => m,
            Err(e) => {
                warnings.push(format!("Cannot stat {}: {}", path.display(), e));
                continue;
            }
        };

        let mtime = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_micros() as i64)
            .unwrap_or(0);
        let size = metadata.len() as i64;

        let path_str = path.to_string_lossy().to_string();

        // Incremental: skip if path, mtime, and size all match.
        if let Some(&(known_mtime, known_size)) = known.get(&path_str) {
            if known_mtime == mtime && known_size == size {
                skipped += 1;
                continue;
            }
        }

        discovered.push(DiscoveredFile {
            path: path.to_path_buf(),
            mtime,
            size,
        });
    }

    (discovered, skipped, warnings)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{Duration, SystemTime};

    #[test]
    fn rescans_same_size_file_changed_within_one_second() {
        let dir = std::env::temp_dir().join(format!("orphetune-mtime-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("track.wav");
        let file = fs::File::create(&path).unwrap();
        let base = SystemTime::UNIX_EPOCH + Duration::from_secs(1_700_000_000);
        file.set_modified(base).unwrap();
        let (first, _, _) = walk_library(&dir, &HashMap::new());
        let known = HashMap::from([(
            path.to_string_lossy().into_owned(),
            (first[0].mtime, first[0].size),
        )]);
        assert_eq!(walk_library(&dir, &known).1, 1);
        file.set_modified(base + Duration::from_millis(100))
            .unwrap();
        assert_eq!(walk_library(&dir, &known).0.len(), 1);
        drop(file);
        fs::remove_file(path).unwrap();
        fs::remove_dir(dir).unwrap();
    }
}
