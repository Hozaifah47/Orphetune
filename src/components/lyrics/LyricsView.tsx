import { useEffect, useMemo, useRef, useState } from "react";
import { LyricsEditor, type LocalLyrics } from "./LyricsEditor";
import { parseLrc, serializeLrc } from "@/services/lrcParser";
import { getSetting, setSetting } from "@/services/db";
import { romanize } from "@/services/romanize";
import { Mic2, RefreshCw } from "lucide-react";
import { useAppStore, usePlayerStore, useLyricsStore } from "@/stores";
import { audioEngine, findActiveLyricIndex, type LrcLine } from "@/services";

function truncateMiddle(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  const half = Math.floor((maxLen - 3) / 2);
  return `${str.slice(0, half)}...${str.slice(str.length - half)}`;
}

type Mode = "page" | "compact" | "side";

export function LyricsView({mode="page"}: {mode?: Mode}) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  return <TrackLyrics mode={mode} key={currentTrack?.id ?? "empty"} />;
}

function TrackLyrics({mode}: {mode:Mode}) {
  const {setView,setLyricsPanel} = useAppStore.getState();
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const localKey = "lyrics-edit-" + currentTrack?.id;
  const [local, setLocal] = useState<LocalLyrics | null>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [following, setFollowing] = useState(true);
  const [filter,setFilter] = useState("");
  const [large,setLarge] = useState(false);
  const [spacious,setSpacious] = useState(false);
  const [options,setOptions] = useState(false);
  const [fullscreen,setFullscreen] = useState(false);
  const [notice,setNotice] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    void getSetting(localKey).then(raw => {
      if (!raw || !active) return;
      const saved = JSON.parse(raw);
      if (saved && typeof saved.text === "string" && typeof saved.translation === "string" && Number.isFinite(saved.offset)) setLocal(saved);
    }).catch(() => {if (active) setNotice("Could not read local lyric edits.");}).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [localKey]);
  useEffect(() => {
    const change = () => setFullscreen(document.fullscreenElement === panel.current);
    document.addEventListener("fullscreenchange",change);
    return () => document.removeEventListener("fullscreenchange",change);
  }, []);
  const seek = usePlayerStore((s) => s.seek);
  const play = usePlayerStore((s) => s.play);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const fetched = useLyricsStore(s => s.currentTrackId === currentTrack?.id ? s.lyrics : null);
  const providerLyrics = useMemo(() => {
    if (!local) return fetched;
    const timed = parseLrc(local.text);
    return timed.lines.length ? timed : null;
  }, [local, fetched]);
  const fetchedPlain = useLyricsStore(s => s.currentTrackId === currentTrack?.id ? s.plainLyrics : null);
  const plainLyrics = local ? (providerLyrics ? null : local.text) : fetchedPlain;
  const fromFile = useLyricsStore(s => s.fromFile);
  const isInstrumental = useLyricsStore((s) => s.isInstrumental);
  const error = useLyricsStore((s) => s.error);
  const notFound = useLyricsStore((s) => s.notFound);
  const isLoading = useLyricsStore((s) => s.isLoading);
  const loadLyricsForTrack = useLyricsStore((s) => s.loadLyricsForTrack);

  const [latin, setLatin] = useState(() => localStorage.getItem("lyrics-script") === "latin");
  const timingKey = "lyrics-timing-" + currentTrack?.id;
  const duration = usePlayerStore(s => s.duration);
  const introEnd = usePlayerStore(s => s.introEnd);
  const plainLines = useMemo(() => plainLyrics?.split(/\r?\n/).filter(line => line.trim()) ?? [], [plainLyrics]);
  const lyrics = useMemo(() => {
    if (providerLyrics || !plainLyrics || !plainLines.length) return providerLyrics;
    let times: number[] | undefined;
    try {
      const saved = JSON.parse(localStorage.getItem(timingKey) ?? "null");
      if (saved?.text === plainLyrics && saved.times?.length === plainLines.length && saved.times.every(Number.isFinite)) times = saved.times;
    } catch { /* Ignore incomplete saved timings. */ }
    if (!times && duration <= introEnd) return null;
    const weights = plainLines.map(text => Math.max(2, text.trim().split(/\s+/).length));
    const total = weights.reduce((sum, value) => sum + value, 0);
    let position = 0;
    const lines: LrcLine[] = plainLines.map((text, i) => {
      const time = times?.[i] ?? introEnd + position / total * (duration - introEnd);
      position += weights[i]!;
      return { id: String(i), text, time };
    });
    return { lines, offsetMs: 0, estimated: !times };
  }, [providerLyrics, plainLyrics, plainLines, timingKey, duration, introEnd]);
  const sourceLines = useMemo(() => lyrics?.lines.map(line => line.text) ?? plainLines, [lyrics, plainLines]);
  const romanized = useMemo(() => sourceLines.map(romanize), [sourceLines]);
  const translations = useMemo(() => local?.translation.split(/\r?\n/) ?? [],[local]);
  const displayLines = latin ? romanized : sourceLines;
  const canRomanize = romanized.some((line, i) => line !== sourceLines[i]);
  const pausedTime = usePlayerStore(s => s.isPlaying ? 0 : s.currentTime);
  const [activeWord, setActiveWord] = useState(-1);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Automatically trigger lyrics fetch when current track changes
  useEffect(() => {
    if (currentTrack && ready && !local) {
      void loadLyricsForTrack(currentTrack);
    }
  }, [currentTrack, loadLyricsForTrack, ready, local]);

  // requestAnimationFrame binary search loop to track active lyric line
  useEffect(() => {
    const lines = lyrics?.lines || [];
    if (lines.length === 0) {
      setActiveIndex(-1);
      return;
    }

    const checkActiveLine = () => {
      const curTime = audioEngine.getCurrentTime() - (local?.offset ?? 0)/1000;
      const idx = findActiveLyricIndex(lines, curTime);
      setActiveIndex(idx);
      setActiveWord(findActiveLyricIndex(lines[idx]?.words ?? [],curTime));

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
  }, [isPlaying, lyrics, pausedTime, local]);

  // Smoothly scroll active line into view
  useEffect(() => {
    if (following && !filter && !editing && activeIndex >= 0 && lineRefs.current[activeIndex]) {
      lineRefs.current[activeIndex]?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
      });
    }
  }, [activeIndex, following, filter, editing]);

  const handleLineClick = (line: LrcLine) => {
    seek(line.time + (local?.offset ?? 0)/1000);
    if (!isPlaying) void play();
  };

  const trackPath = currentTrack
    ? truncateMiddle(
        `${currentTrack.artist}/${currentTrack.album}/${currentTrack.title}`,
        55,
      )
    : null;

  if (mode === "compact") return <aside aria-label="Current lyric" className="flex items-center gap-4 border-t border-non-text/30 px-5 py-2 text-sm">
    <button className="truncate text-left text-bright-red" onClick={() => setView("lyrics")}>{displayLines[activeIndex] || currentTrack?.title || "Lyrics"}</button>
    <button className="ml-auto text-xs text-muted" onClick={() => setLyricsPanel("closed")}>Close lyrics</button>
  </aside>;
  return (
    <div ref={panel} className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0d0404] px-6 pb-4">
      {currentTrack && <div className="mb-2 flex flex-wrap gap-4 text-sm text-muted">
        {mode === "side" && <button onClick={() => setLyricsPanel("closed")}>Close panel</button>}
        <button aria-expanded={options} onClick={() => setOptions(!options)}>Display options</button>
        <button disabled={!ready} onClick={() => setEditing(!editing)}>{editing ? "Close editor" : "Edit or import"}</button>
        <button onClick={async () => {try {if (fullscreen) await document.exitFullscreen(); else await panel.current?.requestFullscreen();} catch {setNotice("Fullscreen is unavailable in this window.");}}}>{fullscreen ? "Exit fullscreen" : "Fullscreen"}</button>
        {!following && <button className="text-bright-red" onClick={() => {setFilter("");setFollowing(true);}}>Follow playback</button>}
      </div>}
      {options && <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-muted">
        {(["side","compact"] as const).filter(v => v !== mode).map(v => <button key={v} onClick={() => {setLyricsPanel(v); if(mode === "page") setView("home");}}>
          {v === "side" ? "Open side panel" : "Show compact lyrics"}</button>)}
        <input aria-label="Find lyric lines" placeholder="Find lyric lines…" className="border-b border-non-text/40 bg-transparent py-1 text-white" value={filter} onChange={e=>setFilter(e.target.value)}/>
        <label><input type="checkbox" checked={large} onChange={e=>setLarge(e.target.checked)}/> Large text</label>
        <label><input type="checkbox" checked={spacious} onChange={e=>setSpacious(e.target.checked)}/> Wider spacing</label>
      </div>}
      {notice && <p role="status" className="text-sm text-muted">{notice}</p>}
      {editing ? <LyricsEditor initial={local ?? {text:providerLyrics ? serializeLrc(providerLyrics.lines) : plainLyrics ?? "",translation:"",offset:0}}
        onClose={() => setEditing(false)}
        onSave={async value => {await setSetting(localKey,JSON.stringify(value));setLocal(value);setEditing(false);}}
        onReset={async () => {await setSetting(localKey,"");setLocal(null);setEditing(false);}}/> : <>
      {/* Header with track name and reload action */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-non-text/20 pb-3 mb-4">
        <div>

          {lyrics && <p className="text-xs text-muted">{"estimated" in lyrics && lyrics.estimated ? "Estimated timing · " : ""}Select a line to play from there.</p>}
          {fromFile && !local && <p className="text-xs text-muted">Lyrics from music library</p>}
          {local && <p className="text-xs text-muted">Local lyrics{local.translation.trim() ? " · Your translation" : ""}</p>}
          {trackPath && (
            <p className="font-mono text-xs text-muted" title={trackPath}>
              {trackPath}
            </p>
          )}
        </div>

        {canRomanize && (
          <div role="group" aria-label="Lyrics script" className="flex items-center gap-1 border-b border-non-text/30">
            {["Original", "Romanized"].map((label, index) => {
              const selected = latin === Boolean(index);
              return <button key={label} type="button" aria-pressed={selected}
                className={`border-b-2 px-3 py-2 text-sm ${selected ? "border-bright-red text-white" : "border-transparent text-muted hover:text-white"}`}
                onClick={() => { setLatin(Boolean(index)); localStorage.setItem("lyrics-script", index ? "latin" : "original"); }}>
                {label}
              </button>;
            })}
          </div>
        )}
        {currentTrack && !local && (
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

      {error && (lyrics || plainLyrics || isInstrumental) && (
        <p role="status" className="mb-2 text-xs text-muted">{error}</p>
      )}

      {/* Content Container */}
      <div
        ref={containerRef}
        onWheel={() => setFollowing(false)} onTouchMove={() => setFollowing(false)}
        onPointerDown={e => {if(e.target === e.currentTarget) setFollowing(false);}}
        onKeyDown={e => {
          if (["ArrowDown","ArrowUp"].includes(e.key)) {
            const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
            const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
            if(i >= 0) {e.preventDefault();setFollowing(false);buttons[i+(e.key === "ArrowDown" ? 1 : -1)]?.focus();}
          }
        }}
        className="flex flex-1 flex-col overflow-y-auto px-4 py-8"
      >
        {!currentTrack ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <Mic2 size={40} className="text-muted" />
            <p className="font-sans text-sm text-muted">
              Play a track to view lyrics
            </p>
          </div>
        ) : !ready || (isLoading && !local) ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="font-mono text-xs text-bright-red">
              [FETCH] Fetching lyrics from LRCLIB...
            </p>
          </div>
        ) : isInstrumental && !local ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <span className="font-mono text-xs text-muted">[INFO] Instrumental</span>
              <p className="font-sans text-xs text-muted">This track has no vocal lyrics</p>
            </div>
          </div>
        ) : error && !lyrics && !plainLyrics ? (
          <p role="alert" className="m-auto text-sm text-muted">{error}</p>
        ) : notFound && !local ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <span className="font-mono text-xs text-muted">[INFO] No lyrics found</span>
              <p className="font-sans text-xs text-muted">
                LRCLIB has no lyrics for this track
              </p>
            </div>
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
          <div className={`flex flex-col max-w-2xl mx-auto w-full py-12 ${spacious ? "gap-12" : "gap-7"}`}>
            {lyrics.lines.map((line, idx) => {
              if (filter && !displayLines[idx]?.toLocaleLowerCase().includes(filter.toLocaleLowerCase())) return null;
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
                  <span className={`font-sans font-bold leading-snug ${large ? "text-4xl" : "text-2xl md:text-3xl"}`}>
                    {isActive && line.words ? line.words.map((word,i) =>
                      <span key={i} className={i > activeWord ? "text-muted" : i === activeWord ? "underline" : undefined}>{latin ? romanize(word.text) : word.text}</span>) : displayLines[idx] || "—"}
                    {translations[idx] && <span className="mt-1 block text-base font-normal text-muted">{translations[idx]}</span>}
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
      </>}
    </div>
  );
}
