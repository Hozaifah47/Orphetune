import type { SourceSelection } from "@/services/tauriCommands";
import { create } from "zustand";
import {
  searchTracks,
  searchWebTracks,
  downloadTrack,
  cancelDownload,
  saveDownload,
  type TrackRow,
  type WebSearchResult,
  type DownloadEventData,
} from "@/services";
import { usePlaylistStore } from "./playlistStore";
import { useLibraryStore } from "./libraryStore";
import { useLogStore } from "./logStore";

export interface DownloadStatus {
  videoId: string;
  percent?: number;
  metrics?: Extract<DownloadEventData, {event: "Transfer"}>["data"];
  path?: string;
  status: "choosing" | "verifying" | "saving" | "cancelled" | "downloading" | "complete" | "error";
  error?: string;
}

interface SearchState {
  query: string;
  localResults: TrackRow[];
  webResults: WebSearchResult[];
  isSearchingWeb: boolean;
  webError: string | null;
  downloads: Record<string, DownloadStatus>;

  setQuery: (query: string) => Promise<void>;
  searchWeb: (query?: string) => Promise<void>;
  triggerDownload: (item: WebSearchResult, source?: SourceSelection) => Promise<void>;
  cancelActiveDownload: (videoId: string) => Promise<void>;
}

let searchRevision = 0;
let localRevision = 0;

export const useSearchStore = create<SearchState>((set, get) => ({
  query: "",
  localResults: [],
  webResults: [],
  isSearchingWeb: false,
  webError: null,
  downloads: {},

  setQuery: async (query: string) => {
    ++searchRevision;
    const revision = ++localRevision;
    set({ query, localResults: [], webResults: [], webError: null, isSearchingWeb: false });
    const trimmed = query.trim();
    if (!trimmed) {
      set({ localResults: [], webResults: [] });
      return;
    }

    // Instant local results from SQLite
    try {
      const local = await searchTracks(trimmed);
      if (revision === localRevision) set({ localResults: local });
    } catch (e) {
      useLogStore
        .getState()
        .addEntry("ERR", `Local search failed: ${String(e)}`);
    }
  },

  searchWeb: async (explicitQuery?: string) => {
    const q = (explicitQuery ?? get().query).trim();
    if (!q) return;

    const addLog = useLogStore.getState().addEntry;
    const revision = ++searchRevision;
    set({ isSearchingWeb: true, webError: null });
    addLog("FETCH", `Querying yt-dlp web search: "${q}"`);

    try {
      const results = await searchWebTracks(q);
      if (revision !== searchRevision) return;
      set({ webResults: results, isSearchingWeb: false });
      addLog("INFO", `Found ${String(results.length)} web results for "${q}"`);
    } catch (e) {
      if (revision !== searchRevision) return;
      set({ isSearchingWeb: false, webError: "Web search failed. Check your connection and try again." });
      const errStr = e instanceof Error ? e.message : String(e);
      addLog("WARN", `Web search unavailable/offline: ${errStr}`);
    }
  },

  triggerDownload: async (item, source) => {
    const previous = get().downloads[item.id]?.status;
    if (previous === "choosing" || previous === "downloading" || previous === "saving" || previous === "verifying") return;
    const update = (status: Omit<DownloadStatus, "videoId">) => {
      set(state => ({ downloads: { ...state.downloads, [item.id]: { videoId: item.id, ...status } } }));
    };
    const addLog = useLogStore.getState().addEntry;
    try {
      if (!useLibraryStore.getState().libraryPath) {
        update({ status: "choosing" });
        await useLibraryStore.getState().init();
        if (!useLibraryStore.getState().libraryPath) await useLibraryStore.getState().pickFolder();
      }
      const root = useLibraryStore.getState().libraryPath;
      if (!root) {
        update({ status: "error", error: "Choose a library folder to save this download." });
        return;
      }
      update({ status: "downloading" });
      const track = await downloadTrack(item.id, root, (event: DownloadEventData) => {
        if (get().downloads[item.id]?.status !== "downloading") return;
        if (event.event === "Verifying") update({status: "verifying"});
        if (event.event === "Transfer") update({status: "downloading", percent: event.data.percent ?? undefined, metrics: event.data});
        if (event.event === "Progress") update({ status: "downloading", percent: event.data.percent });
        if (event.event === "Log") addLog("FETCH", event.data.message);
      }, source);
      update({ status: "saving", path: track.path });
      await saveDownload(track);
      update({ status: "complete", path: track.path });
      addLog("INFO", `Saved to Downloads: ${track.title}`);
      try {
        const playlists = usePlaylistStore.getState();
        await Promise.all([useLibraryStore.getState().loadTracks(), playlists.loadPlaylists()]);
        const active = usePlaylistStore.getState();
        if (active.playlists.some(p => p.system_key === "downloads" && p.id === active.selectedPlaylistId)) {
          await active.selectPlaylist(active.selectedPlaylistId);
        }
      } catch (error) {
        addLog("WARN", `Saved download. Refresh library to see it: ${String(error)}`);
      }
    } catch (error) {
      const message = String(error);
      update(message.includes("cancelled by user") ? { status: "cancelled" } : { status: "error", error: message });
      addLog("WARN", message);
    }
  },

  cancelActiveDownload: async (videoId) => {
    try {
      await cancelDownload(videoId);
    } catch (error) {
      useLogStore.getState().addEntry("ERR", String(error));
    }
  },
}));
