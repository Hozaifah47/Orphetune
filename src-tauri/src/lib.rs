pub mod commands;
mod library_access;
pub mod lyrics;
pub mod metadata;
pub mod scanner;
pub mod sidecar;

use tauri_plugin_sql::{Migration, MigrationKind};

fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create initial tables",
            sql: r#"
            CREATE TABLE IF NOT EXISTS tracks (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                path        TEXT    NOT NULL UNIQUE,
                mtime       INTEGER NOT NULL,
                size        INTEGER NOT NULL,
                title       TEXT    NOT NULL DEFAULT 'Unknown',
                artist      TEXT    NOT NULL DEFAULT 'Unknown Artist',
                album       TEXT    NOT NULL DEFAULT 'Unknown Album',
                track_no    INTEGER,
                duration_ms INTEGER NOT NULL DEFAULT 0,
                format      TEXT    NOT NULL DEFAULT 'mp3',
                cover_path  TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
            CREATE INDEX IF NOT EXISTS idx_tracks_album  ON tracks(album);
            CREATE INDEX IF NOT EXISTS idx_tracks_title  ON tracks(title);

            CREATE TABLE IF NOT EXISTS playlists (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT    NOT NULL,
                created_at INTEGER NOT NULL DEFAULT (unixepoch()),
                updated_at INTEGER NOT NULL DEFAULT (unixepoch())
            );

            CREATE TABLE IF NOT EXISTS playlist_tracks (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
                track_id    INTEGER NOT NULL REFERENCES tracks(id)    ON DELETE CASCADE,
                position    INTEGER NOT NULL,
                added_at    INTEGER NOT NULL DEFAULT (unixepoch()),
                UNIQUE(playlist_id, track_id)
            );

            CREATE TABLE IF NOT EXISTS lyrics_cache (
                track_id     INTEGER PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
                synced       TEXT,
                plain        TEXT,
                instrumental INTEGER NOT NULL DEFAULT 0,
                fetched_at   INTEGER NOT NULL DEFAULT (unixepoch())
            );

            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "identify the Downloads playlist",
            sql: "ALTER TABLE playlists ADD COLUMN system_key TEXT;
              CREATE UNIQUE INDEX idx_playlists_system_key ON playlists(system_key);",
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(library_access::LibraryAccess::default())
        .manage(sidecar::DownloadManager::default())
        .setup(|app| {
            if let Err(error) = library_access::restore(app.handle()) {
                eprintln!("Library authorization could not be restored: {error}");
            }
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:orphetune.db", get_migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            library_access::choose_library,
            library_access::current_library,
            commands::scan_library,
            commands::scan_file,
            commands::fetch_cover_art,
            commands::get_ytdlp_version,
            commands::search_web_tracks,
            commands::download_track,
            commands::cancel_download,
            commands::fetch_lyrics,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Orphetune");
}
