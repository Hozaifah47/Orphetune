import { create } from "zustand";
import {
  searchTracks,
  searchWebTracks,
  downloadTrack,
  cancelDownload,
  upsertTrack,
  type TrackRow,
  type WebSearchResult,
  type DownloadEventData,
} from "@/services";
import { useLibraryStore } from "./libraryStore";
import { useLogStore } from "./logStore";

export interface DownloadStatus {
  videoId: string;
  percent: number;
  status: "idle" | "downloading" | "complete" | "error";
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

  triggerDownload: async (item: WebSearchResult) => {
    const addLog = useLogStore.getState().addEntry;
    const libraryPath = useLibraryStore.getState().libraryPath;

    if (!libraryPath) {
      addLog("ERR", "Cannot download: No library folder selected. Select a folder in Library first.");
      return;
    }

    set((state) => ({
      downloads: {
        ...state.downloads,
        [item.id]: {
          videoId: item.id,
          percent: 0,
          status: "downloading",
        },
      },
    }));

    addLog("FETCH", `Starting download: ${item.title}`);

    try {
      await downloadTrack(
        item.id,
        libraryPath,
        async (evt: DownloadEventData) => {
          switch (evt.event) {
            case "Log":
              addLog(
                evt.data.level as "INFO" | "FETCH" | "WARN" | "ERR",
                evt.data.message,
              );
              break;
            case "Progress":
              set((state) => ({
                downloads: {
                  ...state.downloads,
                  [item.id]: {
                    videoId: item.id,
                    percent: evt.data.percent,
                    status: "downloading",
                  },
                },
              }));
              break;
            case "Complete":
              // Upsert newly ingested track into SQLite
              await upsertTrack(evt.data.track);
              await useLibraryStore.getState().loadTracks();

              set((state) => ({
                downloads: {
                  ...state.downloads,
                  [item.id]: {
                    videoId: item.id,
                    percent: 100,
                    status: "complete",
                  },
                },
              }));
              addLog("INFO", `Downloaded and saved: ${evt.data.track.title}`);
              break;
            case "Error":
              set((state) => ({
                downloads: {
                  ...state.downloads,
                  [item.id]: {
                    videoId: item.id,
                    percent: 0,
                    status: "error",
                    error: evt.data.message,
                  },
                },
              }));
              addLog("ERR", `Download error: ${evt.data.message}`);
              break;
          }
        },
      );
    } catch (e) {
      const errStr = e instanceof Error ? e.message : String(e);
      set((state) => ({
        downloads: {
          ...state.downloads,
          [item.id]: {
            videoId: item.id,
            percent: 0,
            status: "error",
            error: errStr,
          },
        },
      }));
      addLog("ERR", `Download failed: ${errStr}`);
    }
  },

  cancelActiveDownload: async (videoId: string) => {
    try {
      await cancelDownload(videoId);
      set((state) => {
        const next = { ...state.downloads };
        delete next[videoId];
        return { downloads: next };
      });
      useLogStore.getState().addEntry("WARN", `Download cancelled: ${videoId}`);
    } catch (e) {
      useLogStore
        .getState()
        .addEntry("ERR", `Failed to cancel download: ${String(e)}`);
    }
  },
}));
