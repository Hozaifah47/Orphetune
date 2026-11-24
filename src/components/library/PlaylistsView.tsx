import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Pencil, ListMusic, ArrowLeft, Play } from "lucide-react";
import { usePlaylistStore, usePlayerStore } from "@/stores";
import { TrackList } from "./TrackList";
import type { PlaylistRow } from "@/services/db";

export function PlaylistsView() {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const {
    playlists,
    selectedPlaylistId,
    selectedPlaylistTracks,
    loadPlaylists,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    selectPlaylist,
    removeTrack,
  } = usePlaylistStore();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    void loadPlaylists();
  }, [loadPlaylists]);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    await createPlaylist(name);
    setNewName("");
  }, [newName, createPlaylist]);

  const handleRename = useCallback(
    async (playlist: PlaylistRow) => {
      const name = editName.trim();
      if (!name || name === playlist.name) {
        setEditingId(null);
        return;
      }
      await renamePlaylist(playlist.id, name);
      setEditingId(null);
    },
    [editName, renamePlaylist],
  );

  const handleRemoveTrack = useCallback(
    async (trackId: number) => {
      if (selectedPlaylistId !== null) {
        await removeTrack(selectedPlaylistId, trackId);
      }
    },
    [selectedPlaylistId, removeTrack],
  );

  // Playlist detail view.
  if (selectedPlaylistId !== null) {
    const playlist = playlists.find((p) => p.id === selectedPlaylistId);
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => void selectPlaylist(null)}
              className="text-muted transition-fast hover:text-white"
              aria-label="Back to playlists"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="font-sans text-lg font-semibold text-white">
              {playlist?.name ?? "Playlist"}
            </h2>
            <span className="font-mono text-xs text-muted">
              {String(selectedPlaylistTracks.length)} tracks
            </span>
          </div>

          {selectedPlaylistTracks.length > 0 && (
            <button
              onClick={() => {
                const first = selectedPlaylistTracks[0];
                if (first) void playTrack(first, selectedPlaylistTracks);
              }}
              className="flex items-center gap-2 bg-crimson px-3 py-1.5 font-sans text-xs text-white transition-fast hover:bg-bright-red"
            >
              <Play size={14} fill="currentColor" />
              <span>Play playlist</span>
            </button>
          )}
        </div>
        <TrackList
          tracks={selectedPlaylistTracks}
          showRemove
          onRemove={(track) => void handleRemoveTrack(track.id)}
          onTrackClick={(track) => {
            void playTrack(track, selectedPlaylistTracks);
          }}
        />
      </div>
    );
  }

  // Playlists list.
  return (
    <div className="flex flex-1 flex-col overflow-hidden p-6">
      <h2 className="mb-4 font-sans text-lg font-semibold text-white">
        Playlists
      </h2>

      {/* Create new */}
      <div className="mb-4 flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleCreate();
          }}
          placeholder="New playlist name..."
          className="flex-1 border-b border-non-text/30 bg-transparent py-1 font-mono text-sm text-white placeholder:text-non-text focus:border-crimson focus:outline-none"
        />
        <button
          onClick={() => void handleCreate()}
          disabled={!newName.trim()}
          className="text-muted transition-fast hover:text-white disabled:opacity-40"
          aria-label="Create playlist"
        >
          <Plus size={18} />
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <ListMusic size={48} className="text-non-text" />
            <p className="font-sans text-sm text-muted">No playlists yet</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-fast"
            >
              {editingId === playlist.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleRename(playlist);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onBlur={() => void handleRename(playlist)}
                  autoFocus
                  className="flex-1 bg-transparent font-sans text-sm text-white focus:outline-none"
                />
              ) : (
                <button
                  onClick={() => void selectPlaylist(playlist.id)}
                  className="flex-1 text-left font-sans text-sm text-white"
                >
                  {playlist.name}
                </button>
              )}
              {!playlist.system_key && <>
              <button
                onClick={() => {
                  setEditingId(playlist.id);
                  setEditName(playlist.name);
                }}
                className="text-non-text transition-fast hover:text-muted"
                aria-label={`Rename ${playlist.name}`}
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => void deletePlaylist(playlist.id)}
                className="text-non-text transition-fast hover:text-crimson"
                aria-label={`Delete ${playlist.name}`}
              >
                <Trash2 size={14} />
              </button>
              </>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
