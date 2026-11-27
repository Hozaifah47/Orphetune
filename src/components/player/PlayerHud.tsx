import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Sliders,
  Terminal,
  Heart,
  ListMusic,
} from "lucide-react";
import { useCollections } from "@/stores/collectionStore";
import { useAppStore } from "@/stores/appStore";
import { usePlayerStore } from "@/stores/playerStore";
import { TerminalLog } from "@/components/hud/TerminalLog";
import { CoverArt } from "@/components/library/CoverArt";
import { Scrubber } from "./Scrubber";
import { VolumeDial } from "./VolumeDial";

function truncateMiddle(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  const half = Math.floor((maxLen - 3) / 2);
  return `${str.slice(0, half)}...${str.slice(str.length - half)}`;
}

export function PlayerHud() {
  const setView = useAppStore(s => s.setView);
  const introEnd = usePlayerStore(s => s.introEnd);
  const markIntro = usePlayerStore(s => s.markIntro);
  const notice = usePlayerStore(s => s.playbackNotice);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const liked = useCollections(s => !!currentTrack && s.liked.has(currentTrack.id));
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const toggleRepeat = usePlayerStore((s) => s.toggleRepeat);
  const isEqOpen = usePlayerStore((s) => s.isEqOpen);
  const setIsEqOpen = usePlayerStore((s) => s.setIsEqOpen);

  const trackPath = currentTrack
    ? truncateMiddle(
        `${currentTrack.artist}/${currentTrack.album}/${currentTrack.title}`,
        44,
      )
    : "No track selected";

  return (
    <footer
      aria-label="Player HUD"
      className="hud-corners relative flex h-24 shrink-0 items-center justify-between border-t border-non-text/20 px-6 bg-bg-dark"
    >
      {notice && <p role="status" className="absolute bottom-full inset-x-0 border-t border-non-text/30 bg-bg-dark px-5 py-2 text-sm text-white">{notice}</p>}
      <div className="hud-corners-bottom" aria-hidden="true" />

      {/* Left: Track Info & Cover */}
      <div className="flex w-40 lg:w-56 xl:w-72 shrink-0 items-center gap-3">
        <CoverArt
          coverPath={currentTrack?.cover_path ?? null}
          size="md"
          active={isPlaying}
        />
        <div className="min-w-0 flex flex-col justify-center">
          <p
            className="truncate font-mono text-xs text-white"
            title={
              currentTrack
                ? `${currentTrack.artist}/${currentTrack.album}/${currentTrack.title}`
                : undefined
            }
          >
            {trackPath}
          </p>
          <p className="truncate font-sans text-xs text-muted">
            {currentTrack?.artist ?? "—"}
          </p>
          {currentTrack && (
            <button className="self-start text-xs text-muted hover:text-white" title="At the end of the ad, click to save the playback start for this song."
              onClick={() => markIntro(introEnd ? 0 : usePlayerStore.getState().currentTime)}>
              {introEnd ? `Reset intro skip (${Math.round(introEnd)}s)` : "Skip intro to here"}
            </button>
          )}
          {currentTrack && (
            <button onClick={() => setView("lyrics")} className="self-start text-xs text-muted underline hover:text-white">
              Lyrics
            </button>
          )}
        </div>
      </div>

      {/* Center: Controls + Scrubber */}
      <div className="flex flex-1 flex-col items-center gap-1.5 px-4">
        {/* Buttons */}
        <div className="flex items-center gap-5">
          {/* Shuffle Button */}
          <button
            onClick={toggleShuffle}
            aria-label={shuffle ? "Disable shuffle" : "Enable shuffle"}
            aria-pressed={shuffle}
            className={`transition-fast ${
              shuffle ? "text-bright-red" : "text-muted hover:text-white"
            }`}
          >
            <Shuffle size={16} />
          </button>

          {/* Previous Button */}
          <button
            disabled={!currentTrack}
            onClick={() => void previous()}
            aria-label="Previous track"
            className="text-muted transition-fast hover:text-white"
          >
            <SkipBack size={18} />
          </button>

          {/* Play / Pause Button */}
          <button
            onClick={() => void togglePlay()}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex h-8 w-8 items-center justify-center bg-crimson text-white transition-fast hover:bg-bright-red hover:text-bg-dark"
          >
            {isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" strokeWidth={1.5} />
            )}
          </button>

          {/* Next Button */}
          <button
            disabled={!currentTrack}
            onClick={() => void next()}
            aria-label="Next track"
            className="text-muted transition-fast hover:text-white"
          >
            <SkipForward size={18} />
          </button>

          {/* Repeat / Loop Button */}
          <button
            onClick={toggleRepeat}
            aria-label={`Repeat mode: ${repeat}`}
            aria-pressed={repeat !== "off"}
            className={`transition-fast ${
              repeat !== "off" ? "text-bright-red" : "text-muted hover:text-white"
            }`}
          >
            {repeat === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
        </div>

        {/* Scrubber + Time Indicators */}
        <Scrubber />
      </div>

      {/* Right: EQ Button + Volume Dial + Terminal Log */}
      <div className="flex w-40 lg:w-56 xl:w-72 shrink-0 items-center justify-end gap-3">
        {currentTrack && <button aria-label={liked ? "Unlike current song" : "Like current song"} aria-pressed={liked}
          onClick={() => void useCollections.getState().setLiked([currentTrack.id], !liked)} className="p-1 text-muted hover:text-white">
          <Heart size={16} fill={liked ? "currentColor" : "none"} /></button>}
        {/* EQ Modal Trigger */}
        <button
          onClick={() => setIsEqOpen(!isEqOpen)}
          aria-label="Open Equalizer"
          aria-pressed={isEqOpen}
          className={`p-1.5 transition-fast ${
            isEqOpen ? "text-bright-red" : "text-muted hover:text-white"
          }`}
          title="Equalizer"
        >
          <Sliders size={18} />
        </button>

        {/* Ouroboros volume dial */}
        <VolumeDial />

        <button onClick={() => setView("queue")} aria-label="Open queue" title="Queue"
          className="p-1 text-muted hover:text-white">
          <ListMusic size={18} />
        </button>
        <details className="relative">
          <summary aria-label="Diagnostics" title="Diagnostics" className="cursor-pointer list-none p-1 text-muted hover:text-white">
            <Terminal size={18} />
          </summary>
          <section aria-label="Recent events" className="absolute bottom-full right-0 z-20 mb-2 w-80 border border-non-text/30 bg-bg-dark p-3">
            <TerminalLog />
          </section>
        </details>
      </div>
    </footer>
  );
}
