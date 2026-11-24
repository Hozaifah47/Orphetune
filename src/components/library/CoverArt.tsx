import { Music } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";

interface CoverArtProps {
  coverPath: string | null;
  size?: "sm" | "md" | "lg";
  active?: boolean;
}

const SIZES = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-40 w-40",
} as const;

const ICON_SIZES = {
  sm: 14,
  md: 20,
  lg: 40,
} as const;

export function CoverArt({
  coverPath,
  size = "md",
  active = false,
}: CoverArtProps) {
  const sizeClass = SIZES[size];
  const iconSize = ICON_SIZES[size];
  const cornerClass = active ? "hud-corners hud-corners-active" : "hud-corners";

  return (
    <div
      className={`${cornerClass} relative flex shrink-0 items-center justify-center bg-bg-dark ${sizeClass}`}
    >
      <div className="hud-corners-bottom" aria-hidden="true" />
      {coverPath ? (
        <img
          src={convertFileSrc(coverPath)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <Music size={iconSize} className="text-non-text" />
      )}
    </div>
  );
}
