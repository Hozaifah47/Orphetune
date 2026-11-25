# Desktop architecture

App.tsx keeps the navigation, active view, player and equalizer in one Tauri window. Zustand stores coordinate playback, the library, playlists, downloads and lyrics. The frontend accesses SQLite through services/db.ts and calls Rust through services/tauriCommands.ts. Migrations live in src-tauri/src/lib.rs.

The native picker authorizes a library root. Rust validates file paths, scans metadata and resolves bundled yt-dlp and FFmpeg executables. Downloads report measured progress, then import the completed path into the library and Downloads playlist. LRCLIB supplies lyrics. SponsorBlock supplies optional segment boundaries. Local playback and cached lyrics can operate offline.

The player connects a media element through bass, mid and treble filters and a gain node to the Web Audio destination. Linux reads authorized tracks through a tokenized loopback service with byte ranges. Device output and installed codecs determine actual playback capabilities.
