import { useEffect, useMemo, useRef, useState } from "react";
import { romanize } from "@/services/romanize";
import { Mic2, RefreshCw } from "lucide-react";
import { usePlayerStore, useLyricsStore } from "@/stores";
import { audioEngine, findActiveLyricIndex, type LrcLine } from "@/services";

function truncateMiddle(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  const half = Math.floor((maxLen - 3) / 2);
  return `${str.slice(0, half)}...${str.slice(str.length - half)}`;
}

export function LyricsView() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const seek = usePlayerStore((s) => s.seek);
  const play = usePlayerStore((s) => s.play);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const providerLyrics = useLyricsStore((s) => s.lyrics);
  const plainLyrics = useLyricsStore((s) => s.plainLyrics);
  const isInstrumental = useLyricsStore((s) => s.isInstrumental);
  const error = useLyricsStore((s) => s.error);
  const notFound = useLyricsStore((s) => s.notFound);
  const isLoading = useLyricsStore((s) => s.isLoading);
  const loadLyricsForTrack = useLyricsStore((s) => s.loadLyricsForTrack);

  const [latin, setLatin] = useState(() => localStorage.getItem("lyrics-script") === "latin");
  const timingKey = "lyrics-timing-" + currentTrack?.id;
  const [tapTimes, setTapTimes] = useState<number[] | null>(null);
  const [timingVersion, refreshTiming] = useState(0);
  useEffect(() => setTapTimes(null), [timingKey, plainLyrics]);
  const plainLines = useMemo(() => plainLyrics?.split(/\r?\n/).filter(line => line.trim()) ?? [], [plainLyrics]);
  const lyrics = useMemo(() => {
    if (providerLyrics || !plainLyrics) return providerLyrics;
    try {
      const saved = JSON.parse(localStorage.getItem(timingKey) ?? "null");
      if (saved?.text !== plainLyrics || !Array.isArray(saved.times) || saved.times.length !== plainLines.length) return null;
      return { lines: plainLines.map((text, i) => ({ id: String(i), text, time: Number(saved.times[i]) })), offsetMs: 0 };
    } catch { return null; }
  }, [providerLyrics, plainLyrics, plainLines, timingKey, timingVersion]);
  function tapLine() {
    if (!tapTimes || !isPlaying) return;
    const time = audioEngine.getCurrentTime();
    if (time <= (tapTimes[tapTimes.length - 1] ?? -1)) return;
    const times = [...tapTimes, time];
    if (times.length === plainLines.length) {
      localStorage.setItem(timingKey, JSON.stringify({ text: plainLyrics, times }));
      refreshTiming(n => n + 1);
      setTapTimes(null);
    } else setTapTimes(times);
  }
  const sourceLines = useMemo(() => lyrics?.lines.map(line => line.text) ?? plainLines, [lyrics, plainLines]);
  const romanized = useMemo(() => sourceLines.map(romanize), [sourceLines]);
  const displayLines = latin ? romanized : sourceLines;
  const canRomanize = romanized.some((line, i) => line !== sourceLines[i]);
  const pausedTime = usePlayerStore(s => s.isPlaying ? 0 : s.currentTime);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Automatically trigger lyrics fetch when current track changes
  useEffect(() => {
    if (currentTrack) {
      void loadLyricsForTrack(currentTrack);
    }
  }, [currentTrack, loadLyricsForTrack]);

  // requestAnimationFrame binary search loop to track active lyric line
  useEffect(() => {
    const lines = lyrics?.lines || [];
    if (lines.length === 0) {
      setActiveIndex(-1);
      return;
    }

    const checkActiveLine = () => {
      const curTime = audioEngine.getCurrentTime();
      const idx = findActiveLyricIndex(lines, curTime);
      setActiveIndex(idx);

      if (isPlaying) {
        animFrameRef.current = requestAnimationFrame(checkActiveLine);
      }
    };

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(checkActiveLine);
    } else {
      // Sync once when paused
      checkActiveLine();
    }

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPlaying, lyrics, pausedTime]);

  // Smoothly scroll active line into view
  useEffect(() => {
    if (activeIndex >= 0 && lineRefs.current[activeIndex]) {
      lineRefs.current[activeIndex]?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
      });
    }
  }, [activeIndex]);

  const handleLineClick = (line: LrcLine) => {
    seek(line.time);
    if (!isPlaying) void play();
  };

  const trackPath = currentTrack
    ? truncateMiddle(
        `${currentTrack.artist}/${currentTrack.album}/${currentTrack.title}`,
        55,
      )
    : null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-6">
      {/* Header with track name and reload action */}
      <div className="flex items-center justify-between border-b border-non-text/20 pb-3 mb-4">
        <div>
          <h2 className="font-sans text-base font-semibold text-white">Lyrics</h2>
          {lyrics && <p className="text-xs text-muted">Select a line to play from there.</p>}
          {trackPath && (
            <p className="font-mono text-xs text-muted" title={trackPath}>
              {trackPath}
            </p>
          )}
        </div>

        {plainLines.length > 0 && !providerLyrics && (
          <button className="text-xs text-muted hover:text-white" onClick={() => {
            if (tapTimes) setTapTimes(null);
            else { setTapTimes([]); seek(usePlayerStore.getState().introEnd); void play(); }
          }}>{tapTimes ? "Cancel timing" : lyrics ? "Redo timing" : "Sync lines"}</button>
        )}
        {canRomanize && (
          <select aria-label="Lyrics script" value={latin ? "latin" : "original"} className="bg-bg-dark text-white text-sm p-2"
            onChange={event => { setLatin(event.target.value === "latin"); localStorage.setItem("lyrics-script", event.target.value); }}>
            <option value="original">Original script</option>
            <option value="latin">Romanized (Latin letters)</option>
          </select>
        )}
        {currentTrack && (
          <button
            onClick={() => void loadLyricsForTrack(currentTrack, true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-muted transition-fast hover:text-white disabled:opacity-40"
            aria-label="Refresh lyrics"
            title="Refetch lyrics from LRCLIB"
          >
            <RefreshCw size={14} />
            <span className="font-sans text-xs">Refetch</span>
          </button>
        )}
      </div>

      {/* Content Container */}
      <div
        ref={containerRef}
        className="flex flex-1 flex-col overflow-y-auto px-4 py-8"
      >
        {!currentTrack ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <Mic2 size={40} className="text-muted" />
            <p className="font-sans text-sm text-muted">
              Play a track to view lyrics
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="font-mono text-xs text-bright-red">
              [FETCH] Fetching lyrics from LRCLIB...
            </p>
          </div>
        ) : isInstrumental ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <span className="font-mono text-xs text-muted">[INFO] Instrumental</span>
              <p className="font-sans text-xs text-muted">This track has no vocal lyrics</p>
            </div>
          </div>
        ) : error && !lyrics && !plainLyrics ? (
          <p role="alert" className="m-auto text-sm text-muted">{error}</p>
        ) : notFound ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <span className="font-mono text-xs text-muted">[INFO] No lyrics found</span>
              <p className="font-sans text-xs text-muted">
                LRCLIB has no lyrics for this track
              </p>
            </div>
          </div>
        ) : tapTimes ? (
          <div className="m-auto max-w-xl text-center">
            <p className="mb-4 text-sm text-muted">Tap each line when you hear it begin · {tapTimes.length + 1} / {plainLines.length}</p>
            <button disabled={!isPlaying} onClick={tapLine} className="p-4 text-3xl font-bold text-white disabled:opacity-50">
              {displayLines[tapTimes.length]}
            </button>
          </div>
        ) : plainLyrics && !lyrics ? (
          /* Plain Unsynced Lyrics */
          <div className="max-w-2xl mx-auto w-full py-4">
            <p className="mb-4 text-xs text-muted">Lyrics without timestamps</p>
            <p className="font-sans text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
              {displayLines.join("\n")}
            </p>
          </div>
        ) : lyrics && lyrics.lines.length > 0 ? (
          /* Synced Lyrics with Click-to-Seek and > Active Cue */
          <div className="flex flex-col gap-7 max-w-2xl mx-auto w-full py-12">
            {lyrics.lines.map((line, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  type="button"
                  key={line.id}
                  ref={(el) => {
                    lineRefs.current[idx] = el;
                  }}
                  onClick={() => handleLineClick(line)}
                  className={`group flex text-left items-start gap-3 cursor-pointer select-none transition-fast ${
                    isActive
                      ? "text-bright-red font-semibold scale-[1.02] origin-left"
                      : "text-muted hover:text-white"
                  }`}
                  aria-current={isActive ? "true" : undefined}
                  aria-label={`Play from this line: ${displayLines[idx]}`}
                >
                  {/* Leading > Cue Marker */}
                  <span
                    className={`font-mono text-sm shrink-0 w-4 select-none ${
                      isActive ? "text-bright-red opacity-100" : "opacity-0 group-hover:opacity-30"
                    }`}
                  >
                    &gt;
                  </span>

                  {/* Lyric Text in IBM Plex Sans */}
                  <span className="font-sans text-2xl font-bold leading-snug md:text-3xl">
                    {displayLines[idx] || "—"}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="font-mono text-xs text-muted">[INFO] No lyrics found</p>
          </div>
        )}
      </div>
    </div>
  );
}
