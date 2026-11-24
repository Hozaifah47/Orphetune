import {
  Play,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Music,
} from "lucide-react";
import { TerminalLog } from "@/components/hud/TerminalLog";

export function PlayerHud() {
  return (
    <footer className="relative flex h-24 shrink-0 items-center border-t border-non-text/20 px-4">
      {/* Track info */}
      <div className="flex w-72 shrink-0 items-center gap-3">
        {/* Missing cover placeholder: bracketed square with music note */}
        <div className="hud-corners relative flex h-14 w-14 shrink-0 items-center justify-center bg-bg-dark">
          <div className="hud-corners-bottom" aria-hidden="true" />
          <Music size={20} className="text-non-text" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-mono text-sm text-white">
            No track selected
          </p>
          <p className="truncate font-sans text-xs text-muted">—</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-1 flex-col items-center gap-1">
        <div className="flex items-center gap-4">
          <button
            aria-label="Shuffle"
            className="text-muted transition-fast hover:text-white"
          >
            <Shuffle size={16} />
          </button>
          <button
            aria-label="Previous"
            className="text-muted transition-fast hover:text-white"
          >
            <SkipBack size={18} />
          </button>
          <button
            aria-label="Play"
            className="flex h-8 w-8 items-center justify-center bg-crimson text-white transition-fast hover:bg-bright-red"
          >
            <Play size={16} fill="currentColor" />
          </button>
          <button
            aria-label="Next"
            className="text-muted transition-fast hover:text-white"
          >
            <SkipForward size={18} />
          </button>
          <button
            aria-label="Repeat"
            className="text-muted transition-fast hover:text-white"
          >
            <Repeat size={16} />
          </button>
        </div>

        {/* Scrubber placeholder */}
        <div className="flex w-full max-w-md items-center gap-2">
          <span className="font-mono text-[10px] text-muted">
            00 : 00 : 00 : 00
          </span>
          <div
            role="slider"
            aria-label="Playback position"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            tabIndex={0}
            className="relative h-1 flex-1 bg-non-text/30"
          >
            <div
              className="absolute inset-y-0 left-0 bg-crimson"
              style={{ width: "0%" }}
            />
          </div>
          <span className="font-mono text-[10px] text-muted">0:00</span>
        </div>
      </div>

      {/* Volume + Log */}
      <div className="flex w-72 shrink-0 flex-col items-end gap-1">
        <div className="w-full max-w-[200px]">
          <TerminalLog />
        </div>
      </div>
    </footer>
  );
}
