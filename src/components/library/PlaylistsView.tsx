import { useCallback } from "react";
import { ListMusic, ArrowLeft, Play } from "lucide-react";
import { usePlaylistStore, usePlayerStore } from "@/stores";
import { TrackList } from "./TrackList";


export function PlaylistsView() {
  const playTrack = usePlayerStore((s) => s.playTrack);
  const {
    playlists,
    selectedPlaylistId,
    selectedPlaylistTracks,
    selectPlaylist,
    removeTrack,
    reorderTracks,
  } = usePlaylistStore();

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
              className="flex items-center gap-2 bg-crimson px-3 py-1.5 font-sans text-xs text-white transition-fast hover:bg-bright-red hover:text-bg-dark"
            >
              <Play size={14} fill="currentColor" />
              <span>Play playlist</span>
            </button>
          )}
        </div>
        <TrackList
          tracks={selectedPlaylistTracks}
          showRemove
          onMove={(index, offset) => {
            const ids = selectedPlaylistTracks.map(track => track.id);
            const id = ids[index];
            if (id === undefined) return;
            ids.splice(index, 1);
            ids.splice(index + offset, 0, id);
            void reorderTracks(selectedPlaylistId, ids);
          }}
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
      {playlists.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <ListMusic size={48} className="text-muted" />
            <p className="font-sans text-sm text-muted">No playlists yet</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1 overflow-y-auto">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-fast"
            >
              <button className="w-full truncate py-1 text-left text-sm hover:text-bright-red" onClick={() => void selectPlaylist(playlist.id)}>{playlist.name}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
