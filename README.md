# Orphetune

A local-first desktop music player built with Tauri v2, React 18, Vite, and Rust. Features a Cyberpunk Terminal HUD design system, Web Audio API engine with a 3-band geometric equalizer, SQLite metadata caching, in-app music discovery, and synced terminal lyrics.

---

## Updating the Pinned yt-dlp & ffmpeg Sidecars

Orphetune uses `yt-dlp` and `ffmpeg` as external sidecars for in-app web music discovery and direct local MP3 downloading. Sidecar binaries are named according to Tauri's target-triple convention:
```
src-tauri/binaries/yt-dlp-<target-triple>[.exe]
src-tauri/binaries/ffmpeg-<target-triple>[.exe]
```

### Automatic Update via Script

To update the pinned versions:

1. Open `scripts/fetch-sidecars`.
2. Update the `YTDLP_VERSION` variable to the desired release tag from [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases), for example:
   ```bash
   YTDLP_VERSION="2025.02.19"
   ```
3. Run the script:
   ```bash
   ./scripts/fetch-sidecars
   ```
4. The script detects your host target triple, fetches the corresponding standalone binary, sets executable permissions, and places it in `src-tauri/binaries/`.

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
npm install

# Fetch sidecar binaries for host architecture
./scripts/fetch-sidecars

# Run in development mode
npm run tauri dev

# Type check and build
npx tsc --noEmit
npm run build
cd src-tauri && cargo check
```
