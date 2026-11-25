# Development roadmap

| Phase | Scope and dependency | Status |
|---|---|---|
| 0 | Audit, build and dependency baseline | Current Ubuntu audit in STATUS.md |
| 1 | Desktop foundation, navigation, HUD and diagnostics | Ubuntu foundation checkpoint verified |
| 2 | Library, metadata, artwork, basic playlists and persistence | Ubuntu local library checkpoint verified. Measurements in PERFORMANCE.md |
| 3 | Playback, queue, EQ and media controls over the library | Ubuntu core playback and queue checkpoint verified. See AUDIO_ENGINE.md |
| 4 | Discovery, download, cancellation and import | Partial. Conversion cancellation needs end-to-end verification |
| 5 | Interactive lyrics and cache | Partial. Provider, parser and store tests exist. Offline native replay and vocal alignment remain open |
| 6 | Home, artists, favorites and richer library navigation | Expansion after baseline |
| 7 | Format selection, acquisition quality and recovery | Requires phase 4 |
| 8 | Enhanced lyric timestamps and karaoke | Requires phase 5 and suitable source timings |
| 9 | Advanced audio controls | Requires verified audio baseline |
| 10 | Local discovery and personalization | Requires reliable library data and listening events |
| 11 | Statistics and listening insights | Requires persisted history |
| 12 | Customization and portability | Requires stable settings and schema |
| 13 | Optional connected experience | Experimental, subject to approval |
| 14 | Production hardening and cross-platform packaging | Stable-release gate |

Baseline phases 0–5 precede expansion. Clean installations, migration safety, dependency checks and accessibility are release requirements. Synchronization and experimental audio processing require separate decisions.
