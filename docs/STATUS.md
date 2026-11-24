# Orphetune acceptance audit

Inherited revision 17f00b7 on Ubuntu 24.04.5 x86_64, WebKitGTK 2.52.6, Node 22.23.4, Cargo 1.100.0. Only the Linux development environment was exercised. All five phases are PARTIAL. The shell crashes at launch, library writes race scan completion, the audio graph lacks smoothing, discovery accepts an untrusted directory, and stale lyrics can overwrite the current track.

## Baseline evidence

TypeScript and Vite passed. Vitest passed all 12 parser and lookup tests. Cargo check passed. Cargo test passed with zero tests. Rustfmt failed. Strict Clippy reported three errors in sidecar/mod.rs (40, 173, 256). A fresh-profile native launch exited 101 at lib.rs:97. The SQL plugin expected an array at tauri.conf.json:44. Release bundling was started separately. No listening test or clean-machine installation has been completed.

## Acceptance matrix

Evidence is scoped to each observation. Runtime behavior requires the indicated follow-up even where static implementation is present.

| ID | Status | Severity | Evidence | Issue | Proposed fix or verification |
|---|---|---|---|---|---|
| G1 Technology Requirements | PASS | P3 | Manifests, strict tsconfig, tracked tree, migration registration and db.ts | Stack and SQLite ownership match | Recheck manifests on upgrades |
| G2 Mandatory Verification Commands | PARTIAL | P1 | Baseline commands above | Formatting and strict lint fail | Format Rust and repair Clippy findings |
| G3 Security | FAIL | P1 | tauri.conf.json:29 and scan_library / download_track arguments | Global asset grant and unchecked IPC roots | Native picker-owned canonical roots with restart and revocation tests |
| G4 Repository Hygiene | PASS | P3 | Manifests, strict tsconfig, tracked tree, migration registration and db.ts | Stack and SQLite ownership match | Recheck manifests on upgrades |
| G5 Offline Behavior | PARTIAL | P1 | libraryStore.ts:103–133 and lyricsStore.ts:112 | Async errors and completion are not isolated from UI state | Await ingestion and guard asynchronous state publication |
| G6 Error Handling | PARTIAL | P1 | libraryStore.ts:103–133 and lyricsStore.ts:112 | Async errors and completion are not isolated from UI state | Await ingestion and guard asynchronous state publication |
| G7 Resource Cleanup | PARTIAL | P1 | libraryStore.ts:103–133 and lyricsStore.ts:112 | Async errors and completion are not isolated from UI state | Await ingestion and guard asynchronous state publication |
| G8 Database Ownership | PASS | P3 | Manifests, strict tsconfig, tracked tree, migration registration and db.ts | Stack and SQLite ownership match | Recheck manifests on upgrades |
| A1 Project Structure | PASS | P3 | Manifests, strict tsconfig, tracked tree, migration registration and db.ts | Stack and SQLite ownership match | Recheck manifests on upgrades |
| A2 Separation of Responsibilities | PARTIAL | P1 | libraryStore.ts:103–133 and lyricsStore.ts:112 | Async errors and completion are not isolated from UI state | Await ingestion and guard asynchronous state publication |
| A3 Single Source of Truth | PARTIAL | P1 | libraryStore.ts:103–133 and lyricsStore.ts:112 | Async errors and completion are not isolated from UI state | Await ingestion and guard asynchronous state publication |
| A4 Code Quality | PARTIAL | P1 | Baseline commands above | Formatting and strict lint fail | Format Rust and repair Clippy findings |
| D1 Visual Direction | PARTIAL | P2 | Sidebar.tsx:63,82 and TerminalLog.tsx:8–9 | Inactive color used for text and warning yellow outside palette | Use readable tokens and inspect all views |
| D2 Color Tokens | PARTIAL | P2 | Sidebar.tsx:63,82 and TerminalLog.tsx:8–9 | Inactive color used for text and warning yellow outside palette | Use readable tokens and inspect all views |
| D3 Geometry | PARTIAL | P2 | tailwind.config.js, index.css, VolumeDial, CoverArt, PlayerHud and TerminalLog | Shell implemented, native visual and keyboard check blocked by launch | Check minimum size and populated states after startup fix |
| D4 Corner Brackets | PARTIAL | P2 | tailwind.config.js, index.css, VolumeDial, CoverArt, PlayerHud and TerminalLog | Shell implemented, native visual and keyboard check blocked by launch | Check minimum size and populated states after startup fix |
| D5 Typography | PARTIAL | P2 | tailwind.config.js, index.css, VolumeDial, CoverArt, PlayerHud and TerminalLog | Shell implemented, native visual and keyboard check blocked by launch | Check minimum size and populated states after startup fix |
| D6 Volume Dial | PARTIAL | P2 | tailwind.config.js, index.css, VolumeDial, CoverArt, PlayerHud and TerminalLog | Shell implemented, native visual and keyboard check blocked by launch | Check minimum size and populated states after startup fix |
| D7 Icons and Missing Artwork | PARTIAL | P2 | tailwind.config.js, index.css, VolumeDial, CoverArt, PlayerHud and TerminalLog | Shell implemented, native visual and keyboard check blocked by launch | Check minimum size and populated states after startup fix |
| D8 Terminal Logging | PARTIAL | P2 | tailwind.config.js, index.css, VolumeDial, CoverArt, PlayerHud and TerminalLog | Shell implemented, native visual and keyboard check blocked by launch | Check minimum size and populated states after startup fix |
| D9 Motion | FAIL | P2 | LibraryView.tsx:147 and LyricsView.tsx:112 | Scans and lyric retrieval spin icons | Keep actual status and remove rotation |
| D10 Accessibility | PARTIAL | P2 | Scrubber keyboard handler, EQ focus effect, fixed-width HUD groups | Full focus order and responsive behavior unverified | Exercise keyboard-only at 900x600 and 1366x768 |
| D11 Complete Anti-Slop Rules | PARTIAL | P2 | Sidebar.tsx:63,82 and TerminalLog.tsx:8–9 | Inactive color used for text and warning yellow outside palette | Use readable tokens and inspect all views |
| U1 Application Layout | PARTIAL | P2 | tailwind.config.js, index.css, VolumeDial, CoverArt, PlayerHud and TerminalLog | Shell implemented, native visual and keyboard check blocked by launch | Check minimum size and populated states after startup fix |
| U2 Desktop Adaptability | PARTIAL | P2 | Scrubber keyboard handler, EQ focus effect, fixed-width HUD groups | Full focus order and responsive behavior unverified | Exercise keyboard-only at 900x600 and 1366x768 |
| U3 Interaction Refinement | PARTIAL | P2 | Scrubber keyboard handler, EQ focus effect, fixed-width HUD groups | Full focus order and responsive behavior unverified | Exercise keyboard-only at 900x600 and 1366x768 |
| U4 Keyboard Shortcuts | PARTIAL | P2 | Scrubber keyboard handler, EQ focus effect, fixed-width HUD groups | Full focus order and responsive behavior unverified | Exercise keyboard-only at 900x600 and 1366x768 |
| P1.1 Application Setup | PASS | P3 | Manifests, strict tsconfig, tracked tree, migration registration and db.ts | Stack and SQLite ownership match | Recheck manifests on upgrades |
| P1.2 Design Configuration | PARTIAL | P2 | tailwind.config.js, index.css, VolumeDial, CoverArt, PlayerHud and TerminalLog | Shell implemented, native visual and keyboard check blocked by launch | Check minimum size and populated states after startup fix |
| P1.3 Core Components | PARTIAL | P2 | tailwind.config.js, index.css, VolumeDial, CoverArt, PlayerHud and TerminalLog | Shell implemented, native visual and keyboard check blocked by launch | Check minimum size and populated states after startup fix |
| P1.4 Application Launch | FAIL | P0 | Native dev launch, exit 101, tauri.conf.json:44 | SQL plugin rejects preload map before main window | Use a URL array and launch against a fresh profile |
| P1.5 Visual Acceptance | PARTIAL | P2 | Sidebar.tsx:63,82 and TerminalLog.tsx:8–9 | Inactive color used for text and warning yellow outside palette | Use readable tokens and inspect all views |
| P2.1 SQLite Database | PARTIAL | P1 | lib.rs migration and db.ts playlist writes | Reorder writes one row at a time and can partially succeed | Atomic reorder and concurrent insertion tests |
| P2.2 Rust File Scanner | FAIL | P1 | scanner/mod.rs:38 | Recursive walker follows links outside selected root | Skip links and test mixed-case tracks and external links |
| P2.3 Scanner Reliability | FAIL | P1 | scanner/mod.rs:38 | Recursive walker follows links outside selected root | Skip links and test mixed-case tracks and external links |
| P2.4 Metadata Extraction | PARTIAL | P1 | metadata/mod.rs and commands/mod.rs try_itunes | Unbounded artwork buffers and direct final-path writes | Limit image size, validate content and publish atomically |
| P2.5 Album Artwork Pipeline | PARTIAL | P1 | metadata/mod.rs and commands/mod.rs try_itunes | Unbounded artwork buffers and direct final-path writes | Limit image size, validate content and publish atomically |
| P2.6 Database Ingestion | FAIL | P1 | libraryStore.ts:103,128,132 and tauriCommands.ts channel | Async callback not joined before library reload, one write per track | Serialize batches, await completion, fault-test DB writes |
| P2.7 Library UI | PARTIAL | P3 | TrackList uses react-virtual, useAudioEngine publishes time every animation frame | No render or large-library measurements | Profile populated track, album and lyrics views |
| P2.8 Playlists | PARTIAL | P1 | lib.rs migration and db.ts playlist writes | Reorder writes one row at a time and can partially succeed | Atomic reorder and concurrent insertion tests |
| P2.9 Database Reliability | PARTIAL | P1 | lib.rs migration and db.ts playlist writes | Reorder writes one row at a time and can partially succeed | Atomic reorder and concurrent insertion tests |
| P3.1 Audio Architecture | PARTIAL | P1 | audioEngine.ts, playerStore.ts and useAudioEngine.ts | No automated playback, shuffle or persistence verification | Use fixture queue, exercise error, gesture, restore and repeat paths |
| P3.2 Local Audio Delivery | FAIL | P1 | tauri.conf.json:29 and scan_library / download_track arguments | Global asset grant and unchecked IPC roots | Native picker-owned canonical roots with restart and revocation tests |
| P3.3 Audio Lifecycle | PARTIAL | P1 | audioEngine.ts, playerStore.ts and useAudioEngine.ts | No automated playback, shuffle or persistence verification | Use fixture queue, exercise error, gesture, restore and repeat paths |
| P3.4 Playback Store | PARTIAL | P1 | audioEngine.ts, playerStore.ts and useAudioEngine.ts | No automated playback, shuffle or persistence verification | Use fixture queue, exercise error, gesture, restore and repeat paths |
| P3.5 Shuffle | PARTIAL | P1 | audioEngine.ts, playerStore.ts and useAudioEngine.ts | No automated playback, shuffle or persistence verification | Use fixture queue, exercise error, gesture, restore and repeat paths |
| P3.6 Playback Edge Cases | PARTIAL | P1 | audioEngine.ts, playerStore.ts and useAudioEngine.ts | No automated playback, shuffle or persistence verification | Use fixture queue, exercise error, gesture, restore and repeat paths |
| P3.7 Equalizer | PARTIAL | P1 | audioEngine.ts, playerStore.ts and useAudioEngine.ts | No automated playback, shuffle or persistence verification | Use fixture queue, exercise error, gesture, restore and repeat paths |
| P3.8 Audio Quality | PARTIAL | P2 | audioEngine.ts:148–163 | Volume and filters step immediately | Smooth gain changes and measure clipping |
| P3.9 Player HUD | PARTIAL | P2 | Scrubber keyboard handler, EQ focus effect, fixed-width HUD groups | Full focus order and responsive behavior unverified | Exercise keyboard-only at 900x600 and 1366x768 |
| P3.10 Equalizer Modal | PARTIAL | P2 | Scrubber keyboard handler, EQ focus effect, fixed-width HUD groups | Full focus order and responsive behavior unverified | Exercise keyboard-only at 900x600 and 1366x768 |
| P3.11 Media Session | PARTIAL | P1 | audioEngine.ts, playerStore.ts and useAudioEngine.ts | No automated playback, shuffle or persistence verification | Use fixture queue, exercise error, gesture, restore and repeat paths |
| P3.12 Persistence | PARTIAL | P1 | audioEngine.ts, playerStore.ts and useAudioEngine.ts | No automated playback, shuffle or persistence verification | Use fixture queue, exercise error, gesture, restore and repeat paths |
| P3.13 Playback Rendering Performance | PARTIAL | P3 | TrackList uses react-virtual, useAudioEngine publishes time every animation frame | No render or large-library measurements | Profile populated track, album and lyrics views |
| P4.1 Local Search | PARTIAL | P2 | searchStore.ts and search_web | Search paths implemented without offline/native test | Search local fixture offline then explicitly request discovery |
| P4.2 Online Discovery | PARTIAL | P2 | searchStore.ts and search_web | Search paths implemented without offline/native test | Search local fixture offline then explicitly request discovery |
| P4.3 Sidecar Management | FAIL | P1 | scripts/fetch-sidecars and sidecar/mod.rs resolve_sidecar_path | Host Python wrapper copied, packaged suffixless binary missed, cwd/PATH trusted | Use sibling executables and verified release artifacts |
| P4.4 Secure Sidecar Invocation | FAIL | P1 | sidecar/mod.rs download_track and capabilities/default.json | No strict ID or authorized destination check, redundant shell capability | Validate inputs before spawn and remove unused frontend execution |
| P4.5 Download Operation | FAIL | P1 | sidecar/mod.rs download_track and capabilities/default.json | No strict ID or authorized destination check, redundant shell capability | Validate inputs before spawn and remove unused frontend execution |
| P4.6 Download Progress and Management | PARTIAL | P1 | sidecar/mod.rs:272–352 | Undrained stderr and directory search for output | Drain pipes, ingest exact completed path, test cancel and duplicates |
| P4.7 Download Reliability | PARTIAL | P1 | sidecar/mod.rs:272–352 | Undrained stderr and directory search for output | Drain pipes, ingest exact completed path, test cancel and duplicates |
| P4.8 Library Integration | PARTIAL | P1 | sidecar/mod.rs:272–352 | Undrained stderr and directory search for output | Drain pipes, ingest exact completed path, test cancel and duplicates |
| P4.9 Responsible Use and Distribution | UNVERIFIED | P1 | Baseline limited to Linux and parser suite | Native, release, privacy, audit and recovery evidence incomplete | Use disposable profile, fixture library and platform-specific clean installations |
| P4.10 Documentation | FAIL | P1 | scripts/fetch-sidecars and sidecar/mod.rs resolve_sidecar_path | Host Python wrapper copied, packaged suffixless binary missed, cwd/PATH trusted | Use sibling executables and verified release artifacts |
| P5.1 LRCLIB Integration | PARTIAL | P1 | lyricsStore.ts loadLyricsForTrack and LyricsView | Older requests may publish after track switch, errors appear as misses | Guard request identity and distinguish errors, test retry and offline cache |
| P5.2 Lyrics Cache | PARTIAL | P1 | lyricsStore.ts loadLyricsForTrack and LyricsView | Older requests may publish after track switch, errors appear as misses | Guard request identity and distinguish errors, test retry and offline cache |
| P5.3 LRC Parser | PARTIAL | P3 | 12 passing Vitest tests | Parser and binary search covered, other requested cases unverified | Add BOM, CRLF, malformed, and stale request fixtures |
| P5.4 Lyrics Synchronization | PARTIAL | P1 | lyricsStore.ts loadLyricsForTrack and LyricsView | Older requests may publish after track switch, errors appear as misses | Guard request identity and distinguish errors, test retry and offline cache |
| P5.5 Lyrics View | PARTIAL | P1 | lyricsStore.ts loadLyricsForTrack and LyricsView | Older requests may publish after track switch, errors appear as misses | Guard request identity and distinguish errors, test retry and offline cache |
| P5.6 Fallbacks | PARTIAL | P1 | lyricsStore.ts loadLyricsForTrack and LyricsView | Older requests may publish after track switch, errors appear as misses | Guard request identity and distinguish errors, test retry and offline cache |
| S1 Tauri Capabilities | FAIL | P1 | sidecar/mod.rs download_track and capabilities/default.json | No strict ID or authorized destination check, redundant shell capability | Validate inputs before spawn and remove unused frontend execution |
| S2 Asset Protocol | FAIL | P1 | tauri.conf.json:29 and scan_library / download_track arguments | Global asset grant and unchecked IPC roots | Native picker-owned canonical roots with restart and revocation tests |
| S3 Content Security Policy | PARTIAL | P2 | CSP, React text rendering, package manifest, bundle identity | Runtime network and packaging behavior unverified | Inspect CSP console and compare clean installed bundle |
| S4 IPC Validation | FAIL | P1 | tauri.conf.json:29 and scan_library / download_track arguments | Global asset grant and unchecked IPC roots | Native picker-owned canonical roots with restart and revocation tests |
| S5 Untrusted Content | PARTIAL | P2 | CSP, React text rendering, package manifest, bundle identity | Runtime network and packaging behavior unverified | Inspect CSP console and compare clean installed bundle |
| S6 Network Security | PARTIAL | P1 | metadata/mod.rs and commands/mod.rs try_itunes | Unbounded artwork buffers and direct final-path writes | Limit image size, validate content and publish atomically |
| S7 Privacy | FAIL | P1 | sidecar/mod.rs download_track and capabilities/default.json | No strict ID or authorized destination check, redundant shell capability | Validate inputs before spawn and remove unused frontend execution |
| S8 Dependency Security | UNVERIFIED | P1 | Baseline limited to Linux and parser suite | Native, release, privacy, audit and recovery evidence incomplete | Use disposable profile, fixture library and platform-specific clean installations |
| E1 Profiling Before Optimization | UNVERIFIED | P1 | Baseline limited to Linux and parser suite | Native, release, privacy, audit and recovery evidence incomplete | Use disposable profile, fixture library and platform-specific clean installations |
| E2 Low-Resource Optimization | PARTIAL | P3 | TrackList uses react-virtual, useAudioEngine publishes time every animation frame | No render or large-library measurements | Profile populated track, album and lyrics views |
| E3 Large Library Testing | UNVERIFIED | P1 | Baseline limited to Linux and parser suite | Native, release, privacy, audit and recovery evidence incomplete | Use disposable profile, fixture library and platform-specific clean installations |
| E4 Rendering | PARTIAL | P3 | TrackList uses react-virtual, useAudioEngine publishes time every animation frame | No render or large-library measurements | Profile populated track, album and lyrics views |
| E5 Cache Management | PARTIAL | P1 | metadata/mod.rs and commands/mod.rs try_itunes | Unbounded artwork buffers and direct final-path writes | Limit image size, validate content and publish atomically |
| E6 Dependency Efficiency | PARTIAL | P2 | CSP, React text rendering, package manifest, bundle identity | Runtime network and packaging behavior unverified | Inspect CSP console and compare clean installed bundle |
| R1 Network Failure | PARTIAL | P1 | libraryStore.ts:103–133 and lyricsStore.ts:112 | Async errors and completion are not isolated from UI state | Await ingestion and guard asynchronous state publication |
| R2 Filesystem Failure | FAIL | P1 | scanner/mod.rs:38 | Recursive walker follows links outside selected root | Skip links and test mixed-case tracks and external links |
| R3 Database Failure | PARTIAL | P1 | lib.rs migration and db.ts playlist writes | Reorder writes one row at a time and can partially succeed | Atomic reorder and concurrent insertion tests |
| R4 Process Failure | PARTIAL | P1 | sidecar/mod.rs:272–352 | Undrained stderr and directory search for output | Drain pipes, ingest exact completed path, test cancel and duplicates |
| R5 Fault Isolation | PARTIAL | P1 | libraryStore.ts:103–133 and lyricsStore.ts:112 | Async errors and completion are not isolated from UI state | Await ingestion and guard asynchronous state publication |
| T1 Frontend Unit Tests | PARTIAL | P3 | 12 passing Vitest tests | Parser and binary search covered, other requested cases unverified | Add BOM, CRLF, malformed, and stale request fixtures |
| T2 Rust Unit Tests | UNVERIFIED | P1 | Baseline limited to Linux and parser suite | Native, release, privacy, audit and recovery evidence incomplete | Use disposable profile, fixture library and platform-specific clean installations |
| T3 Database Tests | UNVERIFIED | P1 | Baseline limited to Linux and parser suite | Native, release, privacy, audit and recovery evidence incomplete | Use disposable profile, fixture library and platform-specific clean installations |
| T4 Integration Tests | UNVERIFIED | P1 | Baseline limited to Linux and parser suite | Native, release, privacy, audit and recovery evidence incomplete | Use disposable profile, fixture library and platform-specific clean installations |
| T5 Audio Testing | UNVERIFIED | P1 | Baseline limited to Linux and parser suite | Native, release, privacy, audit and recovery evidence incomplete | Use disposable profile, fixture library and platform-specific clean installations |
| T6 Manual Acceptance Test | UNVERIFIED | P1 | Baseline limited to Linux and parser suite | Native, release, privacy, audit and recovery evidence incomplete | Use disposable profile, fixture library and platform-specific clean installations |
| T7 Regression Policy | PARTIAL | P1 | Baseline commands above | Formatting and strict lint fail | Format Rust and repair Clippy findings |
| B1 Application Identity | PARTIAL | P2 | CSP, React text rendering, package manifest, bundle identity | Runtime network and packaging behavior unverified | Inspect CSP console and compare clean installed bundle |
| B2 Linux | FAIL | P1 | scripts/fetch-sidecars and sidecar/mod.rs resolve_sidecar_path | Host Python wrapper copied, packaged suffixless binary missed, cwd/PATH trusted | Use sibling executables and verified release artifacts |
| B3 Windows | UNVERIFIED | P1 | Baseline limited to Linux and parser suite | Native, release, privacy, audit and recovery evidence incomplete | Use disposable profile, fixture library and platform-specific clean installations |
| B4 macOS | UNVERIFIED | P1 | Baseline limited to Linux and parser suite | Native, release, privacy, audit and recovery evidence incomplete | Use disposable profile, fixture library and platform-specific clean installations |
| B5 Clean Installation | UNVERIFIED | P1 | Baseline limited to Linux and parser suite | Native, release, privacy, audit and recovery evidence incomplete | Use disposable profile, fixture library and platform-specific clean installations |
| B6 User Data Protection | UNVERIFIED | P1 | Baseline limited to Linux and parser suite | Native, release, privacy, audit and recovery evidence incomplete | Use disposable profile, fixture library and platform-specific clean installations |

## Contrast against opaque surfaces

| Foreground | #080202 | #110505 | #D32F2F |
|---|---:|---:|---:|
| #FFFFFF | 20.59:1 | 20.04:1 | 4.98:1 |
| #B07A7A | 5.80:1 | 5.64:1 | 1.40:1 |
| #FF3333 | 5.66:1 | 5.51:1 | 1.37:1 |
| #8A5A5A | 3.62:1 | 3.52:1 | 1.14:1 |
| #D32F2F | 4.14:1 | 4.03:1 | 1.00:1 |

## Verification procedure

Run npm test, npm run build, then cargo fmt --check, cargo check, cargo test and cargo clippy --all-targets -- -D warnings in src-tauri. Launch npm run tauri dev with fresh XDG config, cache and data directories. Open Library, Search, Playlists and Lyrics. Open EQ by keyboard, adjust a band, Escape, confirm focus returns. Scan a disposable directory with MP3, FLAC, WAV, Unicode paths, a corrupt file and an external symlink. Compare rows before and after a rescan and restart. Play each valid file and listen while changing EQ, seek and volume. Disconnect networking and repeat local playback and search. Exercise download cancellation only with authorized media. Test each platform from its installed bundle before release.
