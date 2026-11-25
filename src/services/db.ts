import Database from "@tauri-apps/plugin-sql";

import type { ScannedTrack } from "./tauriCommands";

let db: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  db ??= Database.load("sqlite:orphetune.db").catch((error: unknown) => {
    db = null;
    throw error;
  });
  return db;
}

// ─── Tracks ──────────────────────────────────────────────────────────

export interface TrackRow {
  id: number;
  path: string;
  mtime: number;
  size: number;
  title: string;
  artist: string;
  album: string;
  track_no: number | null;
  duration_ms: number;
  format: string;
  cover_path: string | null;
}

export function upsertTrack(track: ScannedTrack): Promise<void> {
  return upsertTracks([track]);
}

export async function upsertTracks(tracks: ScannedTrack[]): Promise<void> {
  if (tracks.length === 0) return;
  const values = tracks.flatMap(t => [
    t.path, t.mtime, t.size, t.title, t.artist, t.album,
    t.trackNo, t.durationMs, t.format, t.coverPath,
  ]);
  const placeholders = tracks.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
  const d = await getDb();
  await d.execute(
    `INSERT INTO tracks (path, mtime, size, title, artist, album, track_no, duration_ms, format, cover_path)
     VALUES ${placeholders}
     ON CONFLICT(path) DO UPDATE SET
       mtime = excluded.mtime,
       size = excluded.size,
       title = excluded.title,
       artist = excluded.artist,
       album = excluded.album,
       track_no = excluded.track_no,
       duration_ms = excluded.duration_ms,
       format = excluded.format,
       cover_path = COALESCE(excluded.cover_path, tracks.cover_path)`,
    values,
  );
}

export async function saveDownload(track: ScannedTrack): Promise<void> {
  await upsertTrack(track);
  const database = await getDb();
  await database.execute(
    `INSERT INTO playlists(name, system_key) VALUES ('Downloads', 'downloads')
     ON CONFLICT(system_key) DO UPDATE SET updated_at = unixepoch()`,
  );
  await database.execute(
    `INSERT INTO playlist_tracks(playlist_id, track_id, position)
     SELECT p.id, t.id,
       (SELECT COALESCE(MAX(position), -1) + 1 FROM playlist_tracks WHERE playlist_id = p.id)
     FROM playlists p JOIN tracks t ON t.path = $1
     WHERE p.system_key = 'downloads'
     ON CONFLICT(playlist_id, track_id) DO NOTHING`,
    [track.path],
  );
}

export async function getAllTracks(): Promise<TrackRow[]> {
  const d = await getDb();
  return d.select<TrackRow[]>(
    "SELECT * FROM tracks ORDER BY artist, album, track_no, title",
  );
}

export async function getKnownFiles(): Promise<
  { path: string; mtime: number; size: number }[]
> {
  const d = await getDb();
  return d.select("SELECT path, mtime, size FROM tracks");
}

export async function searchTracks(query: string): Promise<TrackRow[]> {
  const d = await getDb();
  const words = query.trim().split(/\s+/).filter(Boolean).slice(0, 12);
  if (!words.length) return [];
  const conditions = words.map(() => "instr(lower(title || ' ' || artist || ' ' || album), lower(?)) > 0");
  return d.select<TrackRow[]>(
    `SELECT * FROM tracks WHERE ${conditions.join(" AND ")}
     ORDER BY title = ? COLLATE NOCASE DESC, artist, album, track_no, title LIMIT 100`,
    [...words, query.trim()],
  );
}

export async function updateAlbumCover(artist: string, album: string, path: string): Promise<void> {
  const database = await getDb();
  await database.execute(
    "UPDATE tracks SET cover_path = $1 WHERE artist = $2 AND album = $3 AND cover_path IS NULL",
    [path, artist, album],
  );
}

// ─── Playlists ───────────────────────────────────────────────────────

export interface PlaylistRow {
  system_key: string | null;
  id: number;
  name: string;
  created_at: number;
  updated_at: number;
}

export async function getAllPlaylists(): Promise<PlaylistRow[]> {
  const d = await getDb();
  return d.select<PlaylistRow[]>(
    "SELECT * FROM playlists ORDER BY updated_at DESC",
  );
}

export async function createPlaylist(name: string): Promise<number> {
  const d = await getDb();
  const result = await d.execute(
    "INSERT INTO playlists (name) VALUES ($1)",
    [name],
  );
  return result.lastInsertId ?? 0;
}

export async function renamePlaylist(
  id: number,
  name: string,
): Promise<void> {
  const d = await getDb();
  await d.execute(
    "UPDATE playlists SET name = $1, updated_at = unixepoch() WHERE id = $2",
    [name, id],
  );
}

export async function deletePlaylist(id: number): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM playlists WHERE id = $1", [id]);
}

export async function getPlaylistTracks(
  playlistId: number,
): Promise<TrackRow[]> {
  const d = await getDb();
  return d.select<TrackRow[]>(
    `SELECT t.* FROM tracks t
     JOIN playlist_tracks pt ON pt.track_id = t.id
     WHERE pt.playlist_id = $1
     ORDER BY pt.position, pt.id`,
    [playlistId],
  );
}

export async function addTrackToPlaylist(
  playlistId: number,
  trackId: number,
): Promise<void> {
  const d = await getDb();
  await d.execute(
    `INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position)
     SELECT $1, $2, COALESCE(MAX(position), -1) + 1 FROM playlist_tracks WHERE playlist_id = $1`,
    [playlistId, trackId],
  );
  await d.execute(
    "UPDATE playlists SET updated_at = unixepoch() WHERE id = $1",
    [playlistId],
  );
}

export async function removeTrackFromPlaylist(
  playlistId: number,
  trackId: number,
): Promise<void> {
  const d = await getDb();
  await d.execute(
    "DELETE FROM playlist_tracks WHERE playlist_id = $1 AND track_id = $2",
    [playlistId, trackId],
  );
}

export async function reorderPlaylistTracks(
  playlistId: number,
  trackIds: number[],
): Promise<void> {
  const d = await getDb();
  await d.execute(
    `UPDATE playlist_tracks AS pt SET position = ordered.key
     FROM json_each($1) AS ordered
     WHERE pt.playlist_id = $2 AND pt.track_id = ordered.value`,
    [JSON.stringify(trackIds), playlistId],
  );
}

// ─── Settings ────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const d = await getDb();
  const rows = await d.select<{ value: string }[]>(
    "SELECT value FROM settings WHERE key = $1",
    [key],
  );
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const d = await getDb();
  await d.execute(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

// ─── Lyrics Cache ────────────────────────────────────────────────────

export interface LyricsRow {
  track_id: number;
  synced: string | null;
  plain: string | null;
  instrumental: number;
  fetched_at: number;
}

export async function getCachedLyrics(
  trackId: number,
): Promise<LyricsRow | null> {
  const d = await getDb();
  const rows = await d.select<LyricsRow[]>(
    "SELECT * FROM lyrics_cache WHERE track_id = $1",
    [trackId],
  );
  return rows[0] ?? null;
}

export async function saveLyrics(
  trackId: number,
  data: {
    synced: string | null;
    plain: string | null;
    instrumental: boolean;
  },
): Promise<void> {
  const d = await getDb();
  await d.execute(
    `INSERT INTO lyrics_cache (track_id, synced, plain, instrumental, fetched_at)
     VALUES ($1, $2, $3, $4, unixepoch())
     ON CONFLICT(track_id) DO UPDATE SET
       synced = excluded.synced,
       plain = excluded.plain,
       instrumental = excluded.instrumental,
       fetched_at = unixepoch()`,
    [trackId, data.synced, data.plain, data.instrumental ? 1 : 0],
  );
}
