import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  const listContent = useMemo(
    () =>
      virtualItems.map((virtualRow) => {
        const track = tracks[virtualRow.index];
        if (!track) return null;

        const displayName = truncateMiddle(
          `${track.artist}/${track.album}/${track.title}`,
          60,
        );

        return (
          <div
            key={virtualRow.key}
            className="absolute left-0 right-0 flex items-center gap-3 px-4 hover:bg-white/5 transition-fast"
            style={{
              top: `${String(virtualRow.start)}px`,
              height: `${String(virtualRow.size)}px`,
            }}
          >
            <button
              className="flex flex-1 items-center gap-3 text-left min-w-0"
              onClick={() => onTrackClick?.(track, virtualRow.index)}
            >
              <CoverArt coverPath={track.cover_path} size="sm" />
              <span className="flex-1 truncate font-mono text-sm text-white">
                {displayName}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted">
                {formatDuration(track.duration_ms)}
              </span>
            </button>
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
    [virtualItems, tracks, onTrackClick, onRemove, showRemove],
  );

  if (tracks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="font-sans text-sm text-muted">No tracks</p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-auto">
      <div
        className="relative w-full"
        style={{ height: `${String(rowVirtualizer.getTotalSize())}px` }}
      >
        {listContent}
      </div>
    </div>
  );
}
