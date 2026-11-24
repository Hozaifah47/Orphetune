import { useRef, useCallback, useMemo, useState, useLayoutEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CoverArt } from "./CoverArt";
import type { Album } from "@/stores";

interface AlbumGridProps {
  albums: Album[];
  onAlbumClick?: (album: Album) => void;
}


const ITEM_HEIGHT = 220;
const GAP = 16;

export function AlbumGrid({ albums, onAlbumClick }: AlbumGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);
  useLayoutEffect(() => {
    const container = parentRef.current;
    if (!container) return;
    const measure = () => setColumns(Math.max(1, Math.floor(container.clientWidth / 184)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  const rowCount = Math.ceil(albums.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT + GAP,
    overscan: 3,
  });

  const formatDuration = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes)}:${String(seconds).padStart(2, "0")}`;
  }, []);

  const virtualItems = rowVirtualizer.getVirtualItems();

  const gridContent = useMemo(
    () =>
      virtualItems.map((virtualRow) => {
        const startIdx = virtualRow.index * columns;
        const rowAlbums = albums.slice(startIdx, startIdx + columns);

        return (
          <div
            key={virtualRow.key}
            className="absolute left-0 right-0 grid gap-4 px-2"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              top: `${String(virtualRow.start)}px`,
              height: `${String(ITEM_HEIGHT)}px`,
            }}
          >
            {rowAlbums.map((album) => (
              <button
                key={album.key}
                onClick={() => onAlbumClick?.(album)}
                className="group flex min-w-0 flex-col gap-2 text-left transition-fast hover:bg-white/5 p-2"
              >
                <CoverArt coverPath={album.coverPath} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-sans text-sm text-white">
                    {album.name}
                  </p>
                  <p className="truncate font-sans text-xs text-muted">
                    {album.artist}
                  </p>
                  <p className="font-mono text-[10px] text-muted">
                    {String(album.trackIds.length)} tracks ·{" "}
                    {formatDuration(album.totalDurationMs)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        );
      }),
    [virtualItems, columns, albums, onAlbumClick, formatDuration],
  );

  return (
    <div ref={parentRef} className="flex-1 overflow-auto">
      <div
        className="relative w-full"
        style={{ height: `${String(rowVirtualizer.getTotalSize())}px` }}
      >
        {gridContent}
      </div>
    </div>
  );
}
