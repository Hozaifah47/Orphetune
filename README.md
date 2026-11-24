# Orphetune

A local-first desktop music player built with Tauri v2, React 18, Vite, and Rust. Features a Cyberpunk Terminal HUD design system, Web Audio API engine with a 3-band geometric equalizer, SQLite metadata caching, in-app music discovery, and synced terminal lyrics.

---

## Updating the Pinned yt-dlp & ffmpeg Sidecars

Orphetune uses `yt-dlp` and `ffmpeg` as external sidecars for in-app web music discovery and direct local MP3 downloading. Sidecar binaries are named according to Tauri's target-triple convention:
```
src-tauri/binaries/yt-dlp-<target-triple>[.exe]
src-tauri/binaries/ffmpeg-<target-triple>[.exe]
```

### Install or update

Run `bash scripts/fetch-sidecars` in the repository root. The script verifies yt-dlp against the platform-specific SHA-256 digest from its pinned release and atomically replaces stale copies. Maintainers updating the pin must update the release tag and all four asset digests together. FFmpeg currently comes from the host installation. A distributable FFmpeg build and its licensing notices require separate verification on each target.

### Manual Update

You can also manually place binaries in `src-tauri/binaries/`:
- **Linux (x86_64)**: `yt-dlp-x86_64-unknown-linux-gnu`, `ffmpeg-x86_64-unknown-linux-gnu`
- **Linux (aarch64)**: `yt-dlp-aarch64-unknown-linux-gnu`, `ffmpeg-aarch64-unknown-linux-gnu`
- **macOS (Apple Silicon)**: `yt-dlp-aarch64-apple-darwin`, `ffmpeg-aarch64-apple-darwin`
- **macOS (Intel)**: `yt-dlp-x86_64-apple-darwin`, `ffmpeg-x86_64-apple-darwin`
- **Windows (x64)**: `yt-dlp-x86_64-pc-windows-msvc.exe`, `ffmpeg-x86_64-pc-windows-msvc.exe`

Ensure the binary has executable permissions (`chmod +x`).

Sidecar binaries are ignored in version control (`.gitignore` covers `src-tauri/binaries/*`).

---

## Development

```bash
# Install frontend dependencies
npm ci

# Fetch sidecar binaries for host architecture
bash scripts/fetch-sidecars

# Run in development mode
npm run tauri dev

# Type check and build
npx tsc --noEmit
npm run build
cd src-tauri && cargo check
```


## Downloading music

In Search, enter a title, choose Search Web, and select Download on a result you have permission to save. Choose a music library folder when prompted. The row reports transfer progress and MP3 processing, then shows the file path and an Open Downloads button. The Downloads playlist is also available from Playlists after restarting. A failed transfer shows its error on the result and can be retried.
