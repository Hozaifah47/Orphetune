import { useRef, useCallback } from "react";
import { usePlayerStore } from "@/stores/playerStore";

/**
 * Format total seconds to 00 : 00 : 00 : 00 (HH : MM : SS : centiseconds)
 */
export function formatCentiseconds(totalSec: number): string {
  if (isNaN(totalSec) || totalSec < 0) return "00 : 00 : 00 : 00";
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = Math.floor(totalSec % 60);
  const centiseconds = Math.floor((totalSec % 1) * 100);

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)} : ${pad(minutes)} : ${pad(seconds)} : ${pad(centiseconds)}`;
}

/**
 * Format track duration in M:SS (e.g. 3:40)
 */
export function formatDuration(totalSec: number): string {
  if (isNaN(totalSec) || totalSec <= 0) return "0:00";
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = Math.floor(totalSec % 60);

  if (hours > 0) {
    return `${String(hours)}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes)}:${String(seconds).padStart(2, "0")}`;
}

export function Scrubber() {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);

  const barRef = useRef<HTMLDivElement>(null);

  const handleSeekFromEvent = useCallback(
    (e: MouseEvent | TouchEvent | PointerEvent) => {
      if (!barRef.current || duration <= 0) return;
      const rect = barRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      seek(ratio * duration);
    },
    [duration, seek],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    handleSeekFromEvent(e.nativeEvent);

    e.currentTarget.setPointerCapture(e.pointerId);
    (e.currentTarget as HTMLElement).focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (duration <= 0) return;
    let delta = 0;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        delta = -5;
        break;
      case "ArrowRight":
      case "ArrowUp":
        delta = 5;
        break;
      case "PageDown":
        delta = -10;
        break;
      case "PageUp":
        delta = 10;
        break;
      case "Home":
        seek(0);
        e.preventDefault();
        return;
      case "End":
        seek(duration);
        e.preventDefault();
        return;
      default:
        return;
    }
    e.preventDefault();
    seek(Math.max(0, Math.min(duration, currentTime + delta)));
  };

  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex w-full max-w-xl items-center gap-3">
      {/* HUD digital centiseconds timer */}
      <span className="shrink-0 font-mono text-[11px] text-muted tracking-wider">
        {formatCentiseconds(currentTime)}
      </span>

      {/* Scrubber track */}
      <div
        ref={barRef}
        role="slider"
        tabIndex={0}
        aria-label="Playback position"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={formatDuration(currentTime)}
        onPointerDown={handlePointerDown}
        onPointerMove={e => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) handleSeekFromEvent(e.nativeEvent);
        }}
        onKeyDown={handleKeyDown}
        className="group relative flex h-4 flex-1 cursor-pointer items-center focus-visible:outline-2 focus-visible:outline-bright-red"
      >
        <div className="relative h-1 w-full bg-non-text/30 group-hover:h-1.5 transition-fast">
          {/* Progress fill */}
          <div
            className="absolute inset-y-0 left-0 bg-crimson group-hover:bg-bright-red transition-fast"
            style={{ width: `${String(percent)}%` }}
          />
        </div>
      </div>

      {/* Track total duration */}
      <span className="shrink-0 font-mono text-xs text-muted">
        {formatDuration(duration)}
      </span>
    </div>
  );
}
