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
  error: string | null;

  loadLyricsForTrack: (track: TrackRow, refresh?: boolean) => Promise<void>;
  clear: () => void;
}

let requestId = 0;

export const useLyricsStore = create<LyricsState>((set, get) => ({
  currentTrackId: null,
  lyrics: null,
  plainLyrics: null,
  isInstrumental: false,
  isLoading: false,
  notFound: false,

  error: null,

  loadLyricsForTrack: async (track, refresh = false) => {
    const previous = get();
    const same = previous.currentTrackId === track.id;
    if (same && !refresh && (previous.isLoading || previous.lyrics || previous.plainLyrics || previous.isInstrumental || previous.notFound)) return;
    if (!same) get().clear();
    const active = ++requestId;
    set({ currentTrackId: track.id, isLoading: true, error: null, notFound: false });
    try {
      const cached = refresh ? null : await getCachedLyrics(track.id);
      if (active !== requestId) return;
      const data = cached && (cached.synced || cached.plain || cached.instrumental)
        ? { synced: cached.synced, plain: cached.plain, instrumental: Boolean(cached.instrumental) }
        : await fetchLyrics(track.artist, track.title, track.album, Math.max(0, track.duration_ms / 1000));
      if (active !== requestId) return;
      const parsed = data.synced ? parseLrc(data.synced) : null;
      const lyrics = parsed?.lines.length ? parsed : null;
      const plainLyrics = lyrics ? null : data.plain;
      const notFound = !lyrics && !plainLyrics && !data.instrumental;
      if ((!cached || refresh) && !notFound) await saveLyrics(track.id, data);
      if (active === requestId) set({ lyrics, plainLyrics, isInstrumental: data.instrumental, isLoading: false, notFound });
    } catch (error) {
      if (active !== requestId) return;
      set({ error: "Lyrics could not be loaded. Try again.", isLoading: false });
      useLogStore.getState().addEntry("WARN", String(error));
    }
  },

  clear: () => {
    ++requestId;
    set({
      error: null,
      currentTrackId: null,
      lyrics: null,
      plainLyrics: null,
      isInstrumental: false,
      isLoading: false,
      notFound: false,
    });
  },
}));
