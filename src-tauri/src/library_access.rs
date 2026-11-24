use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};

#[derive(Default)]
pub struct LibraryAccess(Mutex<Option<PathBuf>>);

fn grant_file(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("library-grant.json"))
}

pub fn restore(app: &AppHandle) -> Result<(), String> {
    let file = grant_file(app)?;
    if !file.exists() {
        return Ok(());
    }
    let path: PathBuf = serde_json::from_slice(&fs::read(file).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    if path.is_dir() && path.canonicalize().ok().as_ref() == Some(&path) {
        app.asset_protocol_scope()
            .allow_directory(&path, true)
            .map_err(|e| e.to_string())?;
        *app.state::<LibraryAccess>().0.lock().unwrap() = Some(path);
    }
    Ok(())
}

#[tauri::command]
pub async fn current_library(app: AppHandle) -> Option<PathBuf> {
    app.state::<LibraryAccess>().0.lock().unwrap().clone()
}

#[tauri::command]
pub async fn choose_library(app: AppHandle) -> Result<Option<PathBuf>, String> {
    let Some(selected) = app
        .dialog()
        .file()
        .set_title("Choose music library")
        .blocking_pick_folder()
    else {
        return Ok(None);
    };
    let path = selected
        .into_path()
        .map_err(|e| e.to_string())?
        .canonicalize()
        .map_err(|e| e.to_string())?;
    if !path.is_dir() || path.parent().is_none() {
        return Err("Choose a music folder inside the drive.".into());
    }
    let access = app.state::<LibraryAccess>();
    let previous = access.0.lock().unwrap().clone();
    if previous.as_ref() == Some(&path) {
        return Ok(Some(path));
    }
    let switching = previous.is_some();
    if switching && !app.dialog().message("Switching libraries restarts Orphetune and stops playback. Your playlists and music are kept.")
        .buttons(MessageDialogButtons::OkCancelCustom("Switch and restart".into(), "Cancel".into())).blocking_show() {
        return Ok(None);
    }
    let mut current = access.0.lock().unwrap();
    if *current != previous {
        return Err("The library changed while the picker was open.".into());
    }
    let file = grant_file(&app)?;
    let temp = file.with_extension("new");
    fs::create_dir_all(file.parent().unwrap()).map_err(|e| e.to_string())?;
    fs::write(&temp, serde_json::to_vec(&path).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    fs::rename(temp, file).map_err(|e| e.to_string())?;
    if switching {
        // Tauri grants are additive for the lifetime of a process.
        drop(current);
        app.request_restart();
        return Ok(None);
    }
    app.asset_protocol_scope()
        .allow_directory(&path, true)
        .map_err(|e| e.to_string())?;
    *current = Some(path.clone());
    Ok(Some(path))
}

pub fn authorize(app: &AppHandle, requested: &Path, directory: bool) -> Result<PathBuf, String> {
    let access = app.state::<LibraryAccess>();
    let current = access.0.lock().unwrap();
    let root = current.as_ref().ok_or("Choose your music library first.")?;
    authorize_path(root, requested, directory)
}

fn authorize_path(root: &Path, requested: &Path, directory: bool) -> Result<PathBuf, String> {
    let requested = requested.canonicalize().map_err(|e| e.to_string())?;
    let allowed = if directory {
        requested == *root && requested.is_dir()
    } else {
        requested.starts_with(root) && requested.is_file() && crate::scanner::is_audio(&requested)
    };
    if allowed {
        Ok(requested)
    } else {
        Err("Path outside the authorized music library or unsupported file.".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn restricts_scans_and_audio_to_the_selected_root() {
        let fixture = std::env::temp_dir().join(format!(
            "orphetune-scope-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let library = fixture.join("music");
        fs::create_dir_all(&library).unwrap();
        let library = library.canonicalize().unwrap();
        let audio = library.join("café.WAV");
        let outside = fixture.join("other.mp3");
        let text = library.join("notes.txt");
        for path in [&audio, &outside, &text] {
            fs::write(path, []).unwrap();
        }
        assert!(authorize_path(&library, &library, true).is_ok());
        assert!(authorize_path(&library, &audio, false).is_ok());
        assert!(authorize_path(&library, &fixture, true).is_err());
        assert!(authorize_path(&library, &outside, false).is_err());
        assert!(authorize_path(&library, &text, false).is_err());
        #[cfg(unix)]
        {
            let link = library.join("linked.mp3");
            std::os::unix::fs::symlink(&outside, &link).unwrap();
            assert!(authorize_path(&library, &link, false).is_err());
            let (files, _, _) = crate::scanner::walk_library(&library, &Default::default());
            assert_eq!(files.len(), 1);
            assert_eq!(files[0].path, audio);
        }
        fs::remove_dir_all(fixture).unwrap();
    }
}
