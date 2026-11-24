import { create } from "zustand";
import { open } from "@tauri-apps/plugin-dialog";
import {
  getAllTracks,
  getKnownFiles,
  upsertTrack,
  getSetting,
  setSetting,
  searchTracks,
} from "@/services/db";
import { scanLibrary } from "@/services/tauriCommands";
import { useLogStore } from "./logStore";
import type { TrackRow } from "@/services/db";
import type { ScanEventData } from "@/services/tauriCommands";

export interface Album {
  key: string;
  name: string;
  artist: string;
  coverPath: string | null;
  trackIds: number[];
  totalDurationMs: number;
}

interface LibraryState {
  tracks: TrackRow[];
  albums: Album[];
  isScanning: boolean;
  scanProgress: { scanned: number; total: number } | null;
  libraryPath: string | null;
  initialized: boolean;

  init: () => Promise<void>;
  pickFolder: () => Promise<void>;
  startScan: (dir: string) => Promise<void>;
  rescan: () => Promise<void>;
  loadTracks: () => Promise<void>;
  localSearch: (query: string) => Promise<TrackRow[]>;
}

function groupAlbums(tracks: TrackRow[]): Album[] {
  const map = new Map<string, Album>();
  for (const t of tracks) {
    const key = `${t.artist}|||${t.album}`;
    let album = map.get(key);
    if (!album) {
      album = {
        key,
        name: t.album,
        artist: t.artist,
        coverPath: t.cover_path,
        trackIds: [],
        totalDurationMs: 0,
      };
      map.set(key, album);
    }
    album.trackIds.push(t.id);
    album.totalDurationMs += t.duration_ms;
    if (!album.coverPath && t.cover_path) {
      album.coverPath = t.cover_path;
    }
  }
  return Array.from(map.values());
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  albums: [],
  isScanning: false,
  scanProgress: null,
  libraryPath: null,
  initialized: false,

  init: async () => {
    if (get().initialized) return;
    const path = await getSetting("library_path");
    const tracks = await getAllTracks();
    set({
      libraryPath: path,
      tracks,
      albums: groupAlbums(tracks),
      initialized: true,
    });
  },

  pickFolder: async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected) return;
    const dir = typeof selected === "string" ? selected : selected;
    await setSetting("library_path", dir);
    set({ libraryPath: dir });
    await get().startScan(dir);
  },

  startScan: async (dir: string) => {
    if (get().isScanning) return;
    const addLog = useLogStore.getState().addEntry;
    set({ isScanning: true, scanProgress: null });

    try {
      const knownFiles = await getKnownFiles();

      const handleEvent = async (evt: ScanEventData) => {
        switch (evt.event) {
          case "Log":
            addLog(
              evt.data.level as "INFO" | "FETCH" | "WARN" | "ERR",
              evt.data.message,
            );
            break;
          case "Tracks":
            for (const t of evt.data.tracks) {
              await upsertTrack(t);
            }
            break;
          case "Progress":
            set({ scanProgress: evt.data });
            break;
          case "Complete":
            addLog(
              "INFO",
              `Scan done: ${String(evt.data.new_tracks)} new, ${String(evt.data.skipped)} unchanged`,
            );
            break;
        }
      };

      await scanLibrary(dir, knownFiles, handleEvent);
    } catch (e) {
      addLog("ERR", `Scan failed: ${String(e)}`);
    } finally {
      await get().loadTracks();
      set({ isScanning: false, scanProgress: null });
    }
  },

  rescan: async () => {
    const path = get().libraryPath;
    if (path) {
      await get().startScan(path);
    }
  },

  loadTracks: async () => {
    const tracks = await getAllTracks();
    set({ tracks, albums: groupAlbums(tracks) });
  },

  localSearch: async (query: string) => {
    if (!query.trim()) return get().tracks;
    return searchTracks(query);
  },
}));
