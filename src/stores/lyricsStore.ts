import { create } from "zustand";
import {
  getCachedLyrics,
  saveLyrics,
  fetchLyrics,
  parseLrc,
  type ParsedLyrics,
  type TrackRow,
} from "@/services";
import { useLogStore } from "./logStore";

interface LyricsState {
  currentTrackId: number | null;
  lyrics: ParsedLyrics | null;
  plainLyrics: string | null;
  isInstrumental: boolean;
  isLoading: boolean;
  notFound: boolean;

  loadLyricsForTrack: (track: TrackRow) => Promise<void>;
  clear: () => void;
}

export const useLyricsStore = create<LyricsState>((set, get) => ({
  currentTrackId: null,
  lyrics: null,
  plainLyrics: null,
  isInstrumental: false,
  isLoading: false,
  notFound: false,

  loadLyricsForTrack: async (track: TrackRow) => {
    // If already loaded for this track, avoid refetching
    if (get().currentTrackId === track.id && (get().lyrics || get().plainLyrics || get().isInstrumental || get().notFound)) {
      return;
    }

    set({
      currentTrackId: track.id,
      lyrics: null,
      plainLyrics: null,
      isInstrumental: false,
      notFound: false,
      isLoading: true,
    });

    const addLog = useLogStore.getState().addEntry;

    try {
      // 1. Check SQLite lyrics_cache first (offline-first)
      const cached = await getCachedLyrics(track.id);
      if (cached) {
        if (cached.instrumental === 1) {
          set({ isInstrumental: true, isLoading: false });
          addLog("INFO", `[Cache] Instrumental track: ${track.title}`);
          return;
        }

        if (cached.synced) {
          const parsed = parseLrc(cached.synced);
          set({ lyrics: parsed, isLoading: false });
          addLog("INFO", `[Cache] Loaded synced lyrics: ${track.title}`);
          return;
        }

        if (cached.plain) {
          set({ plainLyrics: cached.plain, isLoading: false });
          addLog("INFO", `[Cache] Loaded plain lyrics: ${track.title}`);
          return;
        }

        // Cached as not found
        set({ notFound: true, isLoading: false });
        return;
      }

      // 2. Fetch from LRCLIB via Rust command
      addLog("FETCH", `Fetching lyrics from LRCLIB: ${track.artist} - ${track.title}`);
      const durationS = track.duration_ms > 0 ? track.duration_ms / 1000 : 0;
      const res = await fetchLyrics(track.artist, track.title, track.album, durationS);

      // 3. Persist to SQLite cache
      await saveLyrics(track.id, {
        synced: res.synced,
        plain: res.plain,
        instrumental: res.instrumental,
      });

      // 4. Update state
      if (res.instrumental) {
        set({ isInstrumental: true, isLoading: false });
        addLog("INFO", `Instrumental track: ${track.title}`);
        return;
      }

      if (res.synced) {
        const parsed = parseLrc(res.synced);
        set({ lyrics: parsed, isLoading: false });
        addLog("INFO", `Synced lyrics found: ${track.title} (${String(parsed.lines.length)} lines)`);
        return;
      }

      if (res.plain) {
        set({ plainLyrics: res.plain, isLoading: false });
        addLog("INFO", `Plain lyrics found: ${track.title}`);
        return;
      }

      set({ notFound: true, isLoading: false });
      addLog("INFO", `No lyrics found on LRCLIB for: ${track.title}`);
    } catch (e) {
      set({ notFound: true, isLoading: false });
      const errStr = e instanceof Error ? e.message : String(e);
      addLog("WARN", `Lyrics fetch error: ${errStr}`);
    }
  },

  clear: () => {
    set({
      currentTrackId: null,
      lyrics: null,
      plainLyrics: null,
      isInstrumental: false,
      isLoading: false,
      notFound: false,
    });
  },
}));
