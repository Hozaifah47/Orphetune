import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:orphetune.db");
  }
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

export async function upsertTrack(t: {
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
}): Promise<void> {
  const d = await getDb();
  await d.execute(
    `INSERT INTO tracks (path, mtime, size, title, artist, album, track_no, duration_ms, format, cover_path)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
    [
      t.path,
      t.mtime,
      t.size,
      t.title,
      t.artist,
      t.album,
      t.trackNo,
      t.durationMs,
      t.format,
      t.coverPath,
    ],
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
  const pattern = `%${query}%`;
  return d.select<TrackRow[]>(
    `SELECT * FROM tracks
     WHERE title LIKE $1 OR artist LIKE $1 OR album LIKE $1
     ORDER BY artist, album, track_no
     LIMIT 100`,
    [pattern],
  );
}

export async function updateTrackCover(
  trackId: number,
  coverPath: string,
): Promise<void> {
  const d = await getDb();
  await d.execute("UPDATE tracks SET cover_path = $1 WHERE id = $2", [
    coverPath,
    trackId,
  ]);
}

// ─── Playlists ───────────────────────────────────────────────────────

export interface PlaylistRow {
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
     ORDER BY pt.position`,
    [playlistId],
  );
}

export async function addTrackToPlaylist(
  playlistId: number,
  trackId: number,
): Promise<void> {
  const d = await getDb();
  const rows = await d.select<{ max_pos: number | null }[]>(
    "SELECT MAX(position) as max_pos FROM playlist_tracks WHERE playlist_id = $1",
    [playlistId],
  );
  const nextPos = (rows[0]?.max_pos ?? -1) + 1;
  await d.execute(
    "INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position) VALUES ($1, $2, $3)",
    [playlistId, trackId, nextPos],
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
  for (let i = 0; i < trackIds.length; i++) {
    await d.execute(
      "UPDATE playlist_tracks SET position = $1 WHERE playlist_id = $2 AND track_id = $3",
      [i, playlistId, trackIds[i]],
    );
  }
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
