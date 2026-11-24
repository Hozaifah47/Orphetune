import { useRef, useMemo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Plus, Check } from "lucide-react";
import { usePlayerStore, usePlaylistStore, useLogStore } from "@/stores";
import { CoverArt } from "./CoverArt";
import type { TrackRow } from "@/services/db";

interface TrackListProps {
  tracks: TrackRow[];
  onTrackClick?: (track: TrackRow, index: number) => void;
  onRemove?: (track: TrackRow) => void;
  showRemove?: boolean;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes)}:${String(seconds).padStart(2, "0")}`;
}

function truncateMiddle(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  const half = Math.floor((maxLen - 3) / 2);
  return `${str.slice(0, half)}...${str.slice(str.length - half)}`;
}

export function TrackList({
  tracks,
  onTrackClick,
  onRemove,
  showRemove = false,
}: TrackListProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const playlists = usePlaylistStore((s) => s.playlists);
  const addTrack = usePlaylistStore((s) => s.addTrack);

  const [activeMenuTrackId, setActiveMenuTrackId] = useState<number | null>(null);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  const handleAddToPlaylist = async (playlistId: number, playlistName: string, track: TrackRow) => {
    await addTrack(playlistId, track.id);
    useLogStore.getState().addEntry("INFO", `Added "${track.title}" to "${playlistName}"`);
    setActiveMenuTrackId(null);
    setAddedNotice(`Added to ${playlistName}`);
    setTimeout(() => setAddedNotice(null), 1800);
  };

  const listContent = useMemo(
    () =>
      virtualItems.map((virtualRow) => {
        const track = tracks[virtualRow.index];
        if (!track) return null;

        const isCurrent = currentTrack?.id === track.id;
        const displayName = truncateMiddle(
          `${track.artist}/${track.album}/${track.title}`,
          55,
        );

        const isMenuOpen = activeMenuTrackId === track.id;

        return (
          <div
            key={virtualRow.key}
            className={`absolute left-0 right-0 flex items-center gap-3 px-4 transition-fast ${
              isCurrent ? "bg-white/10" : "hover:bg-white/5"
            }`}
            style={{
              top: `${String(virtualRow.start)}px`,
              height: `${String(virtualRow.size)}px`,
            }}
          >
            <button
              className="flex flex-1 items-center gap-3 text-left min-w-0"
              onClick={() => onTrackClick?.(track, virtualRow.index)}
            >
              <CoverArt
                coverPath={track.cover_path}
                size="sm"
                active={isCurrent && isPlaying}
              />
              <span
                className={`flex-1 truncate font-mono text-sm ${
                  isCurrent ? "text-bright-red font-semibold" : "text-white"
                }`}
              >
                {displayName}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted">
                {formatDuration(track.duration_ms)}
              </span>
            </button>

            {/* Add to Playlist button / dropdown */}
            {!showRemove && playlists.length > 0 && (
              <div className="relative shrink-0">
                <button
                  onClick={() =>
                    setActiveMenuTrackId(isMenuOpen ? null : track.id)
                  }
                  className="p-1 text-non-text transition-fast hover:text-white"
                  title="Add to playlist"
                  aria-label={`Add ${track.title} to playlist`}
                >
                  <Plus size={14} />
                </button>

                {isMenuOpen && (
                  <div className="hud-corners hud-corners-active absolute right-0 top-full z-30 mt-1 min-w-[140px] border border-non-text/40 bg-bg-dark py-1 shadow-none">
                    <div className="hud-corners-bottom" aria-hidden="true" />
                    <p className="px-3 py-1 font-sans text-[10px] font-semibold text-non-text uppercase tracking-wider">
                      Add to Playlist
                    </p>
                    {playlists.map((pl) => (
                      <button
                        key={pl.id}
                        onClick={() => void handleAddToPlaylist(pl.id, pl.name, track)}
                        className="w-full truncate px-3 py-1 text-left font-sans text-xs text-muted transition-fast hover:bg-white/10 hover:text-white"
                      >
                        {pl.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Remove from playlist button */}
            {showRemove && onRemove && (
              <button
                onClick={() => onRemove(track)}
                className="shrink-0 font-sans text-xs text-non-text hover:text-crimson transition-fast"
                aria-label={`Remove ${track.title}`}
              >
                Remove
              </button>
            )}
          </div>
        );
      }),
    [virtualItems, tracks, onTrackClick, onRemove, showRemove, currentTrack, isPlaying, playlists, activeMenuTrackId],
  );

  if (tracks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="font-sans text-sm text-muted">No tracks</p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="relative flex-1 overflow-auto">
      {addedNotice && (
        <div className="sticky top-2 z-40 mx-auto flex w-fit items-center gap-1.5 border border-bright-red bg-bg-dark px-3 py-1 font-mono text-xs text-bright-red">
          <Check size={12} />
          <span>{addedNotice}</span>
        </div>
      )}
      <div
        className="relative w-full"
        style={{ height: `${String(rowVirtualizer.getTotalSize())}px` }}
      >
        {listContent}
      </div>
    </div>
  );
}
