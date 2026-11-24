import { invoke, Channel } from "@tauri-apps/api/core";

// ─── Scan Events (matches Rust ScanEvent enum) ──────────────────────

export type ScanEventData =
  | { event: "Log"; data: { level: string; message: string } }
  | { event: "Tracks"; data: { tracks: ScannedTrack[] } }
  | { event: "Progress"; data: { scanned: number; total: number } }
  | {
      event: "Complete";
      data: { total: number; new_tracks: number; skipped: number };
    };

export interface ScannedTrack {
  path: string;
  mtime: number;
  size: number;
  title: string;
  artist: string;
  album: string;
  trackNo: number | null;
  durationMs: number;
  format: string;
  coverPath: string | null;
}

export interface KnownFileParam {
  path: string;
  mtime: number;
  size: number;
}

export interface CoverResult {
  artist: string;
  album: string;
  coverPath: string | null;
}

// ─── Commands ────────────────────────────────────────────────────────

export async function scanLibrary(
  dir: string,
  knownFiles: KnownFileParam[],
  onEvent: (event: ScanEventData) => void,
): Promise<void> {
  const channel = new Channel<ScanEventData>();
  channel.onmessage = onEvent;
  await invoke("scan_library", {
    dir,
    knownFiles,
    onEvent: channel,
  });
}

export async function scanFile(path: string): Promise<ScannedTrack> {
  return invoke<ScannedTrack>("scan_file", { path });
}

export async function fetchCoverArt(
  artist: string,
  album: string,
  onEvent: (event: ScanEventData) => void,
): Promise<CoverResult> {
  const channel = new Channel<ScanEventData>();
  channel.onmessage = onEvent;
  return invoke<CoverResult>("fetch_cover_art", {
    artist,
    album,
    onEvent: channel,
  });
}
