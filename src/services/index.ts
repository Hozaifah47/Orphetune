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
export type { ScannedTrack, ScanEventData, CoverResult } from "./tauriCommands";
export { scanLibrary, scanFile, fetchCoverArt } from "./tauriCommands";
