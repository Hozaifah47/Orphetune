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
  path?: string;
  status: "choosing" | "saving" | "cancelled" | "downloading" | "complete" | "error";
  error?: string;
}

interface SearchState {
  query: string;
  localResults: TrackRow[];
  webResults: WebSearchResult[];
  isSearchingWeb: boolean;
  downloads: Record<string, DownloadStatus>;

  setQuery: (query: string) => Promise<void>;
  searchWeb: (query?: string) => Promise<void>;
  triggerDownload: (item: WebSearchResult) => Promise<void>;
  cancelActiveDownload: (videoId: string) => Promise<void>;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: "",
  localResults: [],
  webResults: [],
  isSearchingWeb: false,
  downloads: {},

  setQuery: async (query: string) => {
    set({ query });
    const trimmed = query.trim();
    if (!trimmed) {
      set({ localResults: [], webResults: [] });
      return;
    }

    // Instant local results from SQLite
    try {
      const local = await searchTracks(trimmed);
      set({ localResults: local });
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
    set({ isSearchingWeb: true });
    addLog("FETCH", `Querying yt-dlp web search: "${q}"`);

    try {
      const results = await searchWebTracks(q);
      set({ webResults: results, isSearchingWeb: false });
      addLog("INFO", `Found ${String(results.length)} web results for "${q}"`);
    } catch (e) {
      set({ isSearchingWeb: false });
      const errStr = e instanceof Error ? e.message : String(e);
      addLog("WARN", `Web search unavailable/offline: ${errStr}`);
    }
  },

  triggerDownload: async (item) => {
    const previous = get().downloads[item.id]?.status;
    if (previous === "choosing" || previous === "downloading" || previous === "saving") return;
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
        if (event.event === "Progress") update({ status: "downloading", percent: event.data.percent });
        if (event.event === "Log") addLog("FETCH", event.data.message);
      });
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
