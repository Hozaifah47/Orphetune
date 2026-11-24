import { useState } from "react";
import { Search, Globe, Download, Check, X, Play, Music } from "lucide-react";
import { useSearchStore, usePlayerStore, type WebSearchResult } from "@/stores";
import { TerminalLog } from "@/components/hud/TerminalLog";
import { CoverArt } from "@/components/library/CoverArt";
import type { TrackRow } from "@/services/db";

function formatDurationSec(totalSec: number): string {
  if (isNaN(totalSec) || totalSec <= 0) return "0:00";
  const minutes = Math.floor(totalSec / 60);
  const seconds = Math.floor(totalSec % 60);
  return `${String(minutes)}:${String(seconds).padStart(2, "0")}`;
}

function truncateMiddle(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  const half = Math.floor((maxLen - 3) / 2);
  return `${str.slice(0, half)}...${str.slice(str.length - half)}`;
}

export function SearchView() {
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const localResults = useSearchStore((s) => s.localResults);
  const webResults = useSearchStore((s) => s.webResults);
  const isSearchingWeb = useSearchStore((s) => s.isSearchingWeb);
  const searchWeb = useSearchStore((s) => s.searchWeb);
  const downloads = useSearchStore((s) => s.downloads);
  const triggerDownload = useSearchStore((s) => s.triggerDownload);
  const cancelActiveDownload = useSearchStore((s) => s.cancelActiveDownload);

  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const [inputVal, setInputVal] = useState(query);

  const handleInputChange = (val: string) => {
    setInputVal(val);
    void setQuery(val);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputVal.trim();
    if (trimmed) {
      void searchWeb(trimmed);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-6 gap-6">
      {/* Search Input Bar */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex items-center gap-3 border-b border-non-text/30 pb-3"
      >
        <Search size={18} className="text-muted shrink-0" />
        <input
          type="text"
          value={inputVal}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Search tracks, artists, albums, or web..."
          aria-label="Search"
          className="flex-1 bg-transparent font-mono text-sm text-white placeholder:text-non-text focus:outline-none"
        />
        {inputVal && (
          <button
            type="button"
            onClick={() => handleInputChange("")}
            className="text-non-text transition-fast hover:text-white"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
        <button
          type="submit"
          disabled={!inputVal.trim() || isSearchingWeb}
          className="flex items-center gap-1.5 border border-non-text/40 bg-transparent px-3 py-1 font-sans text-xs text-white transition-fast hover:border-crimson hover:bg-crimson/10 disabled:opacity-40"
        >
          <Globe size={14} />
          <span>{isSearchingWeb ? "Searching..." : "Search Web"}</span>
        </button>
      </form>

      {/* Terminal Log During Operations */}
      {isSearchingWeb && (
        <div className="border border-non-text/20 p-2 bg-bg-dark">
          <TerminalLog />
        </div>
      )}

      {/* Results Container: Two Scrollable Sections */}
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto">
        {/* Section 1: Local Library Results */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-non-text/20 pb-2">
            <h3 className="font-sans text-sm font-semibold tracking-wide text-white">
              Local Library
            </h3>
            <span className="font-mono text-xs text-muted">
              {String(localResults.length)} results
            </span>
          </div>

          {!query.trim() ? (
            <p className="font-sans text-xs text-muted py-6">
              Type in the box above to search local files instantly.
            </p>
          ) : localResults.length === 0 ? (
            <p className="font-sans text-xs text-muted py-6">
              No local tracks matching &quot;{query}&quot;.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {localResults.map((t: TrackRow) => {
                const isCurrent = currentTrack?.id === t.id;
                const displayName = truncateMiddle(
                  `${t.artist}/${t.album}/${t.title}`,
                  48,
                );

                return (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between gap-3 px-3 py-2 transition-fast ${
                      isCurrent ? "bg-white/10" : "hover:bg-white/5"
                    }`}
                  >
                    <button
                      onClick={() => void playTrack(t, localResults)}
                      className="flex flex-1 items-center gap-3 text-left min-w-0"
                    >
                      <CoverArt
                        coverPath={t.cover_path}
                        size="sm"
                        active={isCurrent && isPlaying}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate font-mono text-xs ${
                            isCurrent
                              ? "text-bright-red font-semibold"
                              : "text-white"
                          }`}
                        >
                          {displayName}
                        </p>
                        <p className="truncate font-sans text-[11px] text-muted">
                          {t.artist}
                        </p>
                      </div>
                    </button>
                    <span className="font-mono text-xs text-muted shrink-0">
                      {formatDurationSec(t.duration_ms / 1000)}
                    </span>
                    <button
                      onClick={() => void playTrack(t, localResults)}
                      className="text-muted hover:text-white transition-fast p-1"
                      aria-label={`Play ${t.title}`}
                    >
                      <Play size={14} fill="currentColor" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Web Search Results (yt-dlp) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-non-text/20 pb-2">
            <h3 className="font-sans text-sm font-semibold tracking-wide text-white">
              Web Results (yt-dlp)
            </h3>
            <span className="font-mono text-xs text-muted">
              {String(webResults.length)} results
            </span>
          </div>

          {webResults.length === 0 ? (
            <p className="font-sans text-xs text-muted py-6">
              {isSearchingWeb
                ? "Querying online sources..."
                : "Search online via yt-dlp to discover and download tracks."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {webResults.map((item: WebSearchResult) => {
                const dl = downloads[item.id];
                const isDownloading = dl?.status === "downloading";
                const isComplete = dl?.status === "complete";
                const isError = dl?.status === "error";

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 border border-non-text/20 p-3 bg-bg-dark transition-fast"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Thumbnail or placeholder */}
                      <div className="hud-corners relative flex h-10 w-10 shrink-0 items-center justify-center bg-black overflow-hidden">
                        <div className="hud-corners-bottom" aria-hidden="true" />
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Music size={16} className="text-non-text" />
                        )}
                      </div>

                      {/* Title & Uploader */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-sans text-xs font-semibold text-white">
                          {item.title}
                        </p>
                        <p className="truncate font-sans text-[11px] text-muted">
                          {item.uploader}
                        </p>
                      </div>

                      {/* Duration */}
                      <span className="font-mono text-xs text-muted shrink-0">
                        {formatDurationSec(item.duration)}
                      </span>

                      {/* Download Action */}
                      <div className="shrink-0">
                        {isComplete ? (
                          <span className="flex items-center gap-1 font-sans text-xs text-bright-red">
                            <Check size={14} />
                            <span>Saved</span>
                          </span>
                        ) : isDownloading ? (
                          <button
                            onClick={() => void cancelActiveDownload(item.id)}
                            className="flex items-center gap-1 border border-non-text/40 px-2 py-1 font-sans text-xs text-muted hover:text-crimson transition-fast"
                            title="Cancel download"
                          >
                            <X size={12} />
                            <span>Cancel</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => void triggerDownload(item)}
                            className="flex items-center gap-1 bg-crimson px-2.5 py-1 font-sans text-xs text-white transition-fast hover:bg-bright-red"
                            title={isError ? "Retry download" : "Download as MP3"}
                          >
                            <Download size={12} />
                            <span>{isError ? "Retry" : "Download"}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Real Percentage Progress Bar */}
                    {isDownloading && (
                      <div className="flex items-center gap-2 pt-1">
                        <div className="relative h-1 flex-1 bg-non-text/30">
                          <div
                            className="absolute inset-y-0 left-0 bg-crimson transition-fast"
                            style={{
                              width: `${String(Math.min(100, Math.max(0, dl.percent)))}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-bright-red shrink-0">
                          {String(Math.round(dl.percent))}%
                        </span>
                      </div>
                    )}

                    {isError && dl.error && (
                      <p className="font-mono text-[10px] text-crimson truncate">
                        {dl.error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
