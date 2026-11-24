export { getDb } from "./db";
export type { TrackRow, PlaylistRow, LyricsRow } from "./db";
export {
  upsertTrack,
  getAllTracks,
  getKnownFiles,
  searchTracks,
  updateTrackCover,
  getAllPlaylists,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  getPlaylistTracks,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
  getSetting,
  setSetting,
  getCachedLyrics,
  saveLyrics,
} from "./db";
export type {
  ScannedTrack,
  ScanEventData,
  CoverResult,
  WebSearchResult,
  DownloadEventData,
  LyricsResult,
} from "./tauriCommands";
export {
  scanLibrary,
  scanFile,
  fetchCoverArt,
  getYtdlpVersion,
  searchWebTracks,
  downloadTrack,
  cancelDownload,
  fetchLyrics,
} from "./tauriCommands";
export { audioEngine } from "./audioEngine";
export type { EqSettings } from "./audioEngine";
export { parseLrc, findActiveLyricIndex } from "./lrcParser";
export type { LrcLine, ParsedLyrics } from "./lrcParser";
