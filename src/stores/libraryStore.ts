import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import {
  getAllTracks,
  getKnownFiles,
  upsertTracks,
  updateAlbumCover,
  getSetting,
  setSetting,
  searchTracks,
} from "@/services/db";
import { fetchCoverArt, scanLibrary } from "@/services/tauriCommands";
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
  onlineArt: boolean;
  setOnlineArt: (enabled: boolean) => Promise<void>;

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
  onlineArt: false,
  setOnlineArt: async (enabled) => {
    await setSetting("online_art", String(enabled));
    set({ onlineArt: enabled });
    if (enabled) void fillMissingCovers();
  },

  init: async () => {
    if (get().initialized) return;
    const path = await invoke<string | null>("current_library");
    const tracks = await getAllTracks();
    set({
      libraryPath: path,
      tracks,
      albums: groupAlbums(tracks),
      onlineArt: await getSetting("online_art") === "true",
      initialized: true,
    });
    if (path && path !== await getSetting("library_path")) await get().startScan(path);
    else if (path && get().onlineArt) void fillMissingCovers();
  },

  pickFolder: async () => {
    try {
      const dir = await invoke<string | null>("choose_library");
      if (!dir) return;
      set({ libraryPath: dir });
      await get().startScan(dir);
    } catch (error) {
      useLogStore.getState().addEntry("ERR", String(error));
    }
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
            await upsertTracks(evt.data.tracks);
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
      await setSetting("library_path", dir);
    } catch (e) {
      addLog("ERR", `Scan failed: ${String(e)}`);
    } finally {
      try {
        await get().loadTracks();
        if (get().onlineArt) void fillMissingCovers();
      } catch (error) {
        addLog("ERR", `Library refresh failed: ${String(error)}`);
      } finally {
        set({ isScanning: false, scanProgress: null });
      }
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

let loadingCovers = false;

async function fillMissingCovers(): Promise<void> {
  if (loadingCovers) return;
  loadingCovers = true;
  const store = useLibraryStore;
  try {
    const albums = store.getState().albums.filter(album => !album.coverPath && album.name !== "Unknown Album");
    for (const {artist, name} of albums) {
      if (!store.getState().onlineArt) break;
      const result = await fetchCoverArt(artist, name, event => {
        if (event.event === "Log") useLogStore.getState().addEntry("FETCH", event.data.message);
      });
      if (result.coverPath) {
        await updateAlbumCover(artist, name, result.coverPath);
        store.setState(state => ({
          albums: state.albums.map(album => album.artist === artist && album.name === name
            ? { ...album, coverPath: result.coverPath } : album),
          tracks: state.tracks.map(track => track.artist === artist && track.album === name && !track.cover_path
            ? { ...track, cover_path: result.coverPath } : track),
        }));
      }
    }
  } catch (error) {
    useLogStore.getState().addEntry("WARN", `Artwork lookup failed: ${String(error)}`);
  } finally {
    loadingCovers = false;
  }
}
