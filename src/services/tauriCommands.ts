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

// ─── Web Search & Download Events ───────────────────────────────────

export interface WebSearchResult {
  id: string;
  title: string;
  uploader: string;
  duration: number;
  thumbnail: string | null;
}

export type DownloadEventData =
  | { event: "Log"; data: { level: string; message: string } }
  | { event: "Progress"; data: { percent: number } }
  | { event: "Complete"; data: { track: ScannedTrack } }
  | { event: "Error"; data: { message: string } };

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

export async function getYtdlpVersion(): Promise<string> {
  return invoke<string>("get_ytdlp_version");
}

export async function searchWebTracks(
  query: string,
): Promise<WebSearchResult[]> {
  return invoke<WebSearchResult[]>("search_web_tracks", { query });
}

export async function downloadTrack(
  videoId: string,
  destDir: string,
  onEvent: (event: DownloadEventData) => void,
): Promise<ScannedTrack> {
  const channel = new Channel<DownloadEventData>();
  channel.onmessage = onEvent;
  return invoke<ScannedTrack>("download_track", {
    videoId,
    destDir,
    onEvent: channel,
  });
}

export async function cancelDownload(videoId: string): Promise<boolean> {
  return invoke<boolean>("cancel_download", { videoId });
}
