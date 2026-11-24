import { useCallback, useRef, useState } from "react";
import { usePlayerStore } from "@/stores/playerStore";

/**
 * 8-point compass-rose dial volume control
 *
 * Supports:
 * - Drag / click to set volume (270° sweep from -135° to +135°)
 * - Mouse wheel scrolling
 * - Keyboard navigation (Arrow keys, PageUp/PageDown, Home/End)
 * - Accessible slider semantics (role="slider")
 */
export function VolumeDial() {
  const volume = usePlayerStore((s) => s.volume);
  const setVolume = usePlayerStore((s) => s.setVolume);

  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate volume from pointer position relative to dial center
  const calculateVolumeFromEvent = useCallback((e: MouseEvent | TouchEvent) => {
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

    const onPointerMove = (ev: MouseEvent) => {
      calculateVolumeFromEvent(ev);
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
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

  // Dial angle in degrees: -135° to +135°
  const needleAngle = -135 + volume * 270;
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
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        className={`relative flex h-10 w-10 shrink-0 cursor-pointer select-none items-center justify-center transition-fast focus-visible:outline-2 focus-visible:outline-bright-red ${
          isDragging ? "hud-corners-active" : ""
        }`}
        title={`Volume: ${volPercent}%`}
      >
        <svg
          viewBox="0 0 48 48"
          className="h-full w-full"
          aria-hidden="true"
        >
          {/* Outer ring */}
          <circle
            cx="24"
            cy="24"
            r="21"
            fill="none"
            stroke="#8A5A5A"
            strokeWidth="1"
            strokeDasharray="1 3"
          />

          {/* Active arc track: 270 deg from -135 to current */}
          <circle
            cx="24"
            cy="24"
            r="19"
            fill="none"
            stroke="#8A5A5A"
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />

          {/* 8 Cardinal & Intercardinal Ticks */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const isCardinal = deg % 90 === 0;
            const len = isCardinal ? 3.5 : 2;
            const rad = ((deg - 90) * Math.PI) / 180;
            const x1 = 24 + 19 * Math.cos(rad);
            const y1 = 24 + 19 * Math.sin(rad);
            const x2 = 24 + (19 - len) * Math.cos(rad);
            const y2 = 24 + (19 - len) * Math.sin(rad);

            // Is this tick reached by current volume?
            // Convert deg (0=N, 90=E, 180=S, 270=W) to knob coordinate
            // deg: 225=SW(-135°), 270=W(-90°), 315=NW(-45°), 0=N(0°), 45=NE(+45°), 90=E(+90°), 135=SE(+135°)
            const shiftedDeg = deg >= 180 ? deg - 360 : deg;
            const isCovered =
              shiftedDeg >= -135 &&
              shiftedDeg <= 135 &&
              needleAngle >= shiftedDeg;

            return (
              <line
                key={deg}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isCovered ? "#FF3333" : "#8A5A5A"}
                strokeWidth={isCardinal ? "1.5" : "1"}
              />
            );
          })}

          {/* 8-Point Compass Rose Geometric Star (Fixed Base) */}
          <g transform="translate(24, 24)" opacity="0.6">
            {/* North Point */}
            <polygon points="0,-14 2,-4 0,0" fill="#D32F2F" />
            <polygon points="0,-14 -2,-4 0,0" fill="#8A5A5A" />
            {/* South Point */}
            <polygon points="0,14 2,4 0,0" fill="#8A5A5A" />
            <polygon points="0,14 -2,4 0,0" fill="#8A5A5A" />
            {/* East Point */}
            <polygon points="14,0 4,2 0,0" fill="#8A5A5A" />
            <polygon points="14,0 4,-2 0,0" fill="#8A5A5A" />
            {/* West Point */}
            <polygon points="-14,0 -4,2 0,0" fill="#8A5A5A" />
            <polygon points="-14,0 -4,-2 0,0" fill="#8A5A5A" />

            {/* Corner Points (NE, NW, SE, SW) */}
            <polygon points="8,-8 1,-3 0,0" fill="#8A5A5A" />
            <polygon points="-8,-8 -1,-3 0,0" fill="#8A5A5A" />
            <polygon points="8,8 1,3 0,0" fill="#8A5A5A" />
            <polygon points="-8,8 -1,3 0,0" fill="#8A5A5A" />
          </g>

          {/* Rotating Indicator Arrow / Needle */}
          <g transform={`translate(24, 24) rotate(${needleAngle})`}>
            {/* Center Hub */}
            <circle cx="0" cy="0" r="3" fill="#D32F2F" />
            {/* Needle pointing outward to current volume */}
            <polygon
              points="0,-18 2.5,-3 -2.5,-3"
              fill="#FF3333"
            />
            <polygon
              points="0,6 1.5,0 -1.5,0"
              fill="#8A5A5A"
            />
          </g>
        </svg>
      </div>

      <span className="w-8 font-mono text-[11px] text-muted text-right">
        {volPercent}
      </span>
    </div>
  );
}
