export { getDb } from "./db";
export type { TrackRow, PlaylistRow } from "./db";
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
} from "./db";
export type {
  ScannedTrack,
  ScanEventData,
  CoverResult,
  WebSearchResult,
  DownloadEventData,
} from "./tauriCommands";
export {
  scanLibrary,
  scanFile,
  fetchCoverArt,
  getYtdlpVersion,
  searchWebTracks,
  downloadTrack,
  cancelDownload,
} from "./tauriCommands";
export { audioEngine } from "./audioEngine";
export type { EqSettings } from "./audioEngine";
