import { useEffect, useState, useCallback } from "react";
import { FolderOpen, RefreshCw, ArrowLeft, Play } from "lucide-react";
import { useLibraryStore, usePlayerStore } from "@/stores";
import { TerminalLog } from "@/components/hud/TerminalLog";
import { AlbumGrid } from "./AlbumGrid";
import { TrackList } from "./TrackList";
import type { Album } from "@/stores";
import type { TrackRow } from "@/services/db";

export function LibraryView() {
  const {
    albums,
    tracks,
    isScanning,
    scanProgress,
    libraryPath,
    initialized,
    onlineArt,
    setOnlineArt,
    init,
    pickFolder,
    rescan,
  } = useLibraryStore();

  const playTrack = usePlayerStore((s) => s.playTrack);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);

  useEffect(() => {
    void init();
  }, [init]);

  const albumTracks: TrackRow[] = selectedAlbum
    ? tracks.filter((t) => selectedAlbum.trackIds.includes(t.id))
    : [];

  const handleAlbumClick = useCallback((album: Album) => {
    setSelectedAlbum(album);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedAlbum(null);
  }, []);

  if (!initialized) return null;

  // No library path set yet.
  if (!libraryPath) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <FolderOpen size={48} className="text-muted" />
        <p className="font-sans text-sm text-muted">
          Select a folder to scan your music library
        </p>
        <button
          onClick={() => void pickFolder()}
          className="bg-crimson px-4 py-2 font-sans text-sm text-white transition-fast hover:bg-bright-red hover:text-bg-dark"
        >
          Choose folder
        </button>
      </div>
    );
  }

  // Album detail view.
  if (selectedAlbum) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="text-muted transition-fast hover:text-white"
              aria-label="Back to albums"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="font-sans text-lg font-semibold text-white">
                {selectedAlbum.name}
              </h2>
              <p className="font-sans text-xs text-muted">
                {selectedAlbum.artist}
              </p>
            </div>
          </div>

          {albumTracks.length > 0 && (
            <button
              onClick={() => {
                const first = albumTracks[0];
                if (first) void playTrack(first, albumTracks);
              }}
              className="flex items-center gap-2 bg-crimson px-3 py-1.5 font-sans text-xs text-white transition-fast hover:bg-bright-red hover:text-bg-dark"
            >
              <Play size={14} fill="currentColor" />
              <span>Play album</span>
            </button>
          )}
        </div>
        <TrackList
          tracks={albumTracks}
          onTrackClick={(track) => {
            void playTrack(track, albumTracks);
          }}
        />
      </div>
    );
  }

  // Main library grid.
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="font-sans text-lg font-semibold text-white">
          Library
        </h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={onlineArt} onChange={event => void setOnlineArt(event.target.checked)} />
            Find covers online
          </label>
          {isScanning && scanProgress && (
            <div className="flex items-center gap-2">
              <div className="h-1 w-24 bg-non-text/30">
                <div
                  className="h-full bg-crimson transition-fast"
                  style={{
                    width: `${String(
                      Math.round(
                        (scanProgress.scanned / Math.max(scanProgress.total, 1)) * 100,
                      ),
                    )}%`,
                  }}
                />
              </div>
              <span className="font-mono text-[10px] text-muted">
                {String(scanProgress.scanned)}/{String(scanProgress.total)}
              </span>
            </div>
          )}
          <button
            onClick={() => void pickFolder()}
            className="font-sans text-xs text-muted transition-fast hover:text-white"
          >
            Change folder
          </button>
          <button
            onClick={() => void rescan()}
            disabled={isScanning}
            className="text-muted transition-fast hover:text-white disabled:opacity-40"
            aria-label="Rescan library"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {isScanning && (
        <div className="px-6 pb-2">
          <TerminalLog />
        </div>
      )}

      {albums.length > 0 ? (
        <AlbumGrid albums={albums} onAlbumClick={handleAlbumClick} />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="font-sans text-sm text-muted">
            {isScanning ? "Scanning..." : "No albums found"}
          </p>
        </div>
      )}
    </div>
  );
}
