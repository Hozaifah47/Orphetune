import { SourceFormats } from "./SourceFormats";
import { useTransfers } from "@/stores/transferStore";
import { useCollectionMatches } from "./useCollectionMatches";
import { useState } from "react";
import { Globe, Download, Check, X, Play, Music } from "lucide-react";
import { useSearchStore, usePlayerStore, usePlaylistStore, useAppStore, type WebSearchResult } from "@/stores";
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
  const groups = useCollectionMatches();
  const localResults = useSearchStore((s) => s.localResults);
  const webError = useSearchStore(s => s.webError);
  const webResults = useSearchStore((s) => s.webResults);
  const isSearchingWeb = useSearchStore((s) => s.isSearchingWeb);
  const searchWeb = useSearchStore((s) => s.searchWeb);
  const downloads = useSearchStore((s) => s.downloads);
  const { jobs, enqueue, retry } = useTransfers();
  const cancelActiveDownload = useSearchStore((s) => s.cancelActiveDownload);

  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const [selected, setSelected] = useState<string[]>([]);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-4 gap-4">
      <div className="flex items-center justify-end gap-4 text-sm text-muted">
        <button onClick={() => useAppStore.getState().setView("downloads")}>Download activity</button>
        <button disabled={!query.trim() || isSearchingWeb} onClick={() => void searchWeb()} className="flex items-center gap-2 py-2 text-white disabled:text-muted">
          <Globe size={15}/>{isSearchingWeb ? "Searching online…" : "Search online"}</button>
      </div>
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
              {String(localResults.length)} songs
            </span>
          </div>

          {Object.entries(groups).map(([group,items]) => items.length > 0 && <section key={group}>
            <h4 className="text-xs text-muted">{group === "playlists" ? "Playlists" : group === "artists" ? "Artists" : "Albums"}</h4>
            {items.map(item => <button key={item.key} className="block py-1 text-left text-sm hover:text-bright-red" onClick={item.open}>{item.label}</button>)}
          </section>)}
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
              Online discovery
            </h3>
            <span className="font-mono text-xs text-muted">
              {webResults.length > 1 && <button className="mr-3 text-white hover:underline" onClick={() => enqueue(selected.length ? webResults.filter(item => selected.includes(item.id)) : webResults)}>{selected.length ? "Queue selected" : "Queue all"} as MP3</button>}{String(webResults.length)} results
            </span>
          </div>

          {webError ? <p role="alert" className="text-sm text-muted">{webError}</p> : webResults.length === 0 ? (
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
                const job = jobs.find(j => j.item.id === item.id);
                const isComplete = job?.state === "complete";
                const isError = dl?.status === "error";

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 border border-non-text/20 p-3 bg-bg-dark transition-fast"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {webResults.length > 1 && <input type="checkbox" aria-label={`Select ${item.title}`} checked={selected.includes(item.id)}
                        onChange={e => setSelected(e.target.checked ? [...selected, item.id] : selected.filter(id => id !== item.id))} />}
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
                          <Music size={16} className="text-muted" />
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
                          <button className="flex items-center gap-1 font-sans text-xs text-bright-red" title={job?.path ?? dl?.path}
                            onClick={() => {
                              const playlists = usePlaylistStore.getState();
                              const list = playlists.playlists.find(p => p.system_key === "downloads");
                              useAppStore.getState().setView("playlists");
                              if (list) void playlists.selectPlaylist(list.id);
                            }}>
                            <Check size={14} />
                            <span>Open Downloads</span>
                          </button>
                        ) : job?.state === "queued" ? <span role="status">Queued</span> : dl?.status === "choosing" || dl?.status === "saving" || dl?.status === "verifying" ? (
                          <span role="status" className="text-xs text-muted">{dl.status === "choosing" ? "Selecting folder…" : dl.status === "verifying" ? "Verifying audio…" : "Saving to Downloads…"}</span>
                        ) : isDownloading ? (
                          <button
                            onClick={() => void cancelActiveDownload(item.id)}
                            className="flex items-center gap-1 border border-non-text/40 px-2 py-1 font-sans text-xs text-muted hover:text-bright-red transition-fast"
                            title="Cancel download"
                          >
                            <X size={12} />
                            <span>Cancel</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => job ? retry(item.id) : enqueue([item])}
                            className="flex items-center gap-1 bg-crimson px-2.5 py-1 font-sans text-xs text-white transition-fast hover:bg-bright-red hover:text-bg-dark"
                            title={isError ? "Retry download" : "Download as MP3"}
                          >
                            <Download size={12} />
                            <span>{isError ? "Retry" : "Download"}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {!job && <SourceFormats id={item.id} choose={source => enqueue([item], source)} />}
                    {isDownloading && (dl.percent === undefined ? (
                      <p role="status" className="text-xs text-muted">Starting download…</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <progress aria-label={`Download progress for ${item.title}`} max={100} value={dl.percent}
                          className="h-1 flex-1 accent-crimson" />
                        <span className="text-xs text-white">{Math.floor(dl.percent)}%{dl.percent === 100 ? " · Finishing…" : ""}</span>
                      </div>
                    ))}
                    {isComplete && <p role="status" className="break-all text-xs text-muted">Saved to {job?.path ?? dl?.path}</p>}
                    {dl?.status === "cancelled" && <p role="status" className="text-xs text-muted">Download cancelled</p>}

                    {isError && dl.error && (
                      <p role="alert" className="break-words text-xs text-bright-red">
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
