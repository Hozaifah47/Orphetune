import { useCallback, useRef, useState } from "react";
import { usePlayerStore } from "@/stores/playerStore";

export function VolumeDial() {
  const volume = usePlayerStore((s) => s.volume);
  const setVolume = usePlayerStore((s) => s.setVolume);

  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate volume from pointer position relative to dial center
  const calculateVolumeFromEvent = useCallback((e: MouseEvent | TouchEvent | PointerEvent) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // Angle in degrees where North (straight up) is 0°
    const angle = Math.atan2(dx, -dy) * (180 / Math.PI);

    // Map sweep from -135° (vol 0) through 0° (vol 0.5) to +135° (vol 1.0)
    // Dead zone is between -135° and +135° through the bottom (from 135 to 180 and -180 to -135)
    let newVol: number;
    if (angle >= -135 && angle <= 135) {
      newVol = (angle + 135) / 270;
    } else if (angle > 135) {
      newVol = 1.0;
    } else {
      newVol = 0.0;
    }

    setVolume(Math.max(0, Math.min(1, newVol)));
  }, [setVolume]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    calculateVolumeFromEvent(e.nativeEvent);

    e.currentTarget.setPointerCapture(e.pointerId);
    (e.currentTarget as HTMLElement).focus();

  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    setVolume(Math.max(0, Math.min(1, volume + delta)));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let delta = 0;
    switch (e.key) {
      case "ArrowUp":
      case "ArrowRight":
        delta = 0.05;
        break;
      case "ArrowDown":
      case "ArrowLeft":
        delta = -0.05;
        break;
      case "PageUp":
        delta = 0.1;
        break;
      case "PageDown":
        delta = -0.1;
        break;
      case "Home":
        setVolume(0);
        e.preventDefault();
        return;
      case "End":
        setVolume(1);
        e.preventDefault();
        return;
      default:
        return;
    }
    e.preventDefault();
    setVolume(Math.max(0, Math.min(1, volume + delta)));
  };

  const volPercent = Math.round(volume * 100);

  return (
    <div className="flex items-center gap-2">
      <div
        ref={dialRef}
        role="slider"
        tabIndex={0}
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={volPercent}
        aria-valuetext={`${volPercent}%`}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) calculateVolumeFromEvent(e.nativeEvent);
        }}
        onLostPointerCapture={() => setIsDragging(false)}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        className={`relative flex h-12 w-12 touch-none shrink-0 cursor-pointer select-none items-center justify-center transition-fast focus-visible:outline-2 focus-visible:outline-bright-red ${
          isDragging ? "text-white" : "text-muted hover:text-white"
        }`}
        title={`Volume: ${volPercent}%`}
      >
        <svg
          viewBox="0 0 48 48"
          className="h-full w-full"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M29 6 C18 1 5 10 4 23 C3 36 13 45 25 44
               C37 44 46 33 44 21 C43 14 39 9 33 7
               L36 11 C42 17 42 29 36 35 C29 43 17 40 12 34
               C5 25 9 14 18 11 C21 10 24 10 26 11
               L30 14 L36 12 L39 8 L33 9 L38 6 L32 4 Z"
          />
          <circle cx="31" cy="8" r="1.1" fill="#080202" />
          <path
            d="M15.5 32.5 A12 12 0 1 1 32.5 32.5"
            fill="none"
            stroke="#8A5A5A"
            strokeWidth="2"
          />
          <path
            d="M15.5 32.5 A12 12 0 1 1 32.5 32.5"
            fill="none"
            stroke="#FF3333"
            strokeWidth="2"
            pathLength="100"
            strokeDasharray={`${volPercent} 100`}
          />
        </svg>
      </div>

      <span className="w-8 font-mono text-[11px] text-muted text-right">
        {volPercent}%
      </span>
    </div>
  );
}
