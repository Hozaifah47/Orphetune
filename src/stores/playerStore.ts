import { create } from "zustand";
import { convertFileSrc } from "@tauri-apps/api/core";
import { audioEngine, type EqSettings } from "@/services/audioEngine";
import { getSetting, setSetting, type TrackRow } from "@/services/db";
import { useLogStore } from "./logStore";

export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  queue: TrackRow[];
  originalQueue: TrackRow[];
  currentIndex: number;
  currentTrack: TrackRow | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  eq: EqSettings;
  isEqOpen: boolean;
  initialized: boolean;

  initSettings: () => Promise<void>;
  playTrack: (track: TrackRow, newQueue?: TrackRow[]) => Promise<void>;
  setQueue: (newQueue: TrackRow[], startIndex?: number) => Promise<void>;
  togglePlay: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setEq: (band: "bass" | "mid" | "treble", value: number) => void;
  resetEq: () => void;
  setIsEqOpen: (open: boolean) => void;
  updateTime: (current: number, duration: number) => void;
  handleTrackEnded: () => void;
  handleTrackError: (errorDetails?: string) => void;
}

/**
 * Fisher-Yates shuffle array in place (or clone)
 */
function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

/**
 * Update mediaSession metadata for OS media controls
 */
function updateMediaSession(track: TrackRow | null) {
  if (!("mediaSession" in navigator)) return;

  if (!track) {
    navigator.mediaSession.metadata = null;
    return;
  }

  const artwork: MediaImage[] = [];
  if (track.cover_path) {
    artwork.push({
      src: convertFileSrc(track.cover_path),
      sizes: "512x512",
      type: "image/jpeg",
    });
  }

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist,
    album: track.album,
    artwork,
  });
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  originalQueue: [],
  currentIndex: -1,
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  shuffle: false,
  repeat: "off",
  eq: { bass: 0, mid: 0, treble: 0 },
  isEqOpen: false,
  initialized: false,

  initSettings: async () => {
    if (get().initialized) return;

    try {
      const volStr = await getSetting("player_volume");
      const shufStr = await getSetting("player_shuffle");
      const repStr = await getSetting("player_repeat");
      const eqStr = await getSetting("player_eq");

      const volume = volStr !== null ? parseFloat(volStr) : 0.8;
      const shuffle = shufStr === "true";
      const repeat =
        repStr === "all" || repStr === "one" || repStr === "off"
          ? (repStr as RepeatMode)
          : "off";

      let eq: EqSettings = { bass: 0, mid: 0, treble: 0 };
      if (eqStr) {
        try {
          const parsed = JSON.parse(eqStr) as Partial<EqSettings>;
          eq = {
            bass: typeof parsed.bass === "number" ? parsed.bass : 0,
            mid: typeof parsed.mid === "number" ? parsed.mid : 0,
            treble: typeof parsed.treble === "number" ? parsed.treble : 0,
          };
        } catch {
          // Keep default
        }
      }

      audioEngine.setVolume(volume);
      audioEngine.setAllEq(eq);

      set({
        volume,
        shuffle,
        repeat,
        eq,
        initialized: true,
      });

      // Hook up engine callbacks
      audioEngine.setCallbacks({
        onEnded: () => {
          get().handleTrackEnded();
        },
        onError: (err) => {
          const track = get().currentTrack;
          const msg = err && "message" in err ? err.message : "decode error";
          get().handleTrackError(
            track ? `${track.path} (${msg})` : `Playback error (${msg})`,
          );
        },
      });

      // Wire mediaSession action handlers
      if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler("play", () => {
          void get().play();
        });
        navigator.mediaSession.setActionHandler("pause", () => {
          get().pause();
        });
        navigator.mediaSession.setActionHandler("previoustrack", () => {
          void get().previous();
        });
        navigator.mediaSession.setActionHandler("nexttrack", () => {
          void get().next();
        });
        navigator.mediaSession.setActionHandler("seekto", (details) => {
          if (details.seekTime != null) {
            get().seek(details.seekTime);
          }
        });
        navigator.mediaSession.setActionHandler("seekbackward", (details) => {
          const offset = details.seekOffset || 10;
          get().seek(get().currentTime - offset);
        });
        navigator.mediaSession.setActionHandler("seekforward", (details) => {
          const offset = details.seekOffset || 10;
          get().seek(get().currentTime + offset);
        });
      }
    } catch {
      set({ initialized: true });
    }
  },

  playTrack: async (track: TrackRow, newQueue?: TrackRow[]) => {
    let queue = newQueue || get().queue;
    let originalQueue = newQueue || get().originalQueue;

    if (newQueue) {
      originalQueue = [...newQueue];
      if (get().shuffle) {
        // Current track stays first, rest shuffled
        const rest = newQueue.filter((t) => t.id !== track.id);
        const shuffledRest = fisherYatesShuffle(rest);
        queue = [track, ...shuffledRest];
      } else {
        queue = [...newQueue];
      }
    } else if (get().shuffle && queue.length > 0) {
      // Re-order queue so selected track is at currentIndex
      const foundIdx = queue.findIndex((t) => t.id === track.id);
      if (foundIdx === -1) {
        queue = [track, ...queue];
        originalQueue = [track, ...originalQueue];
      }
    }

    const idx = queue.findIndex((t) => t.id === track.id);
    const resolvedIndex = idx >= 0 ? idx : 0;

    set({
      queue,
      originalQueue,
      currentIndex: resolvedIndex,
      currentTrack: track,
      currentTime: 0,
      duration: track.duration_ms / 1000,
    });

    updateMediaSession(track);

    const assetUrl = convertFileSrc(track.path);
    try {
      await audioEngine.loadAndPlay(assetUrl);
      set({ isPlaying: true });
    } catch (e) {
      get().handleTrackError(
        `Failed to play ${track.path}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  },

  setQueue: async (newQueue: TrackRow[], startIndex = 0) => {
    const originalQueue = [...newQueue];
    let queue = [...newQueue];
    const initialTrack = newQueue[startIndex] ?? null;

    if (get().shuffle && initialTrack) {
      const rest = newQueue.filter((_, i) => i !== startIndex);
      const shuffledRest = fisherYatesShuffle(rest);
      queue = [initialTrack, ...shuffledRest];
    }

    const targetIdx = initialTrack
      ? queue.findIndex((t) => t.id === initialTrack.id)
      : 0;

    set({
      queue,
      originalQueue,
      currentIndex: targetIdx >= 0 ? targetIdx : 0,
      currentTrack: queue[targetIdx] ?? null,
    });

    if (initialTrack) {
      await get().playTrack(initialTrack);
    }
  },

  togglePlay: async () => {
    const { isPlaying, currentTrack, queue, currentIndex } = get();
    if (isPlaying) {
      get().pause();
    } else {
      if (!currentTrack && queue.length > 0) {
        const nextIdx = currentIndex >= 0 ? currentIndex : 0;
        const trackToPlay = queue[nextIdx];
        if (trackToPlay) {
          await get().playTrack(trackToPlay);
          return;
        }
      }
      await get().play();
    }
  },

  play: async () => {
    const { currentTrack } = get();
    if (!currentTrack) return;
    try {
      await audioEngine.play();
      set({ isPlaying: true });
    } catch (e) {
      get().handleTrackError(
        `Playback failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  },

  pause: () => {
    audioEngine.pause();
    set({ isPlaying: false });
  },

  next: async () => {
    const { queue, currentIndex, repeat } = get();
    if (queue.length === 0) return;

    let nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeat === "all") {
        nextIndex = 0;
      } else {
        // Stop playback at end of queue
        get().pause();
        get().seek(0);
        return;
      }
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      await get().playTrack(nextTrack);
    }
  },

  previous: async () => {
    const { queue, currentIndex, currentTime } = get();
    if (queue.length === 0) return;

    // If more than 3 seconds in, restart track
    if (currentTime > 3) {
      get().seek(0);
      return;
    }

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = queue.length - 1;
    }

    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      await get().playTrack(prevTrack);
    }
  },

  seek: (seconds: number) => {
    audioEngine.seek(seconds);
    set({ currentTime: seconds });
  },

  setVolume: (volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    audioEngine.setVolume(clamped);
    set({ volume: clamped });
    void setSetting("player_volume", String(clamped));
  },

  toggleShuffle: () => {
    const { shuffle, originalQueue, currentTrack } = get();
    const newShuffle = !shuffle;

    if (newShuffle) {
      // Fisher-Yates with current track staying first
      if (currentTrack) {
        const rest = originalQueue.filter((t) => t.id !== currentTrack.id);
        const shuffledRest = fisherYatesShuffle(rest);
        const newQueue = [currentTrack, ...shuffledRest];
        set({ shuffle: true, queue: newQueue, currentIndex: 0 });
      } else {
        const newQueue = fisherYatesShuffle(originalQueue);
        set({ shuffle: true, queue: newQueue, currentIndex: 0 });
      }
    } else {
      // Restore original queue, keep track of current track's position
      let restoredIndex = 0;
      if (currentTrack) {
        const found = originalQueue.findIndex((t) => t.id === currentTrack.id);
        if (found >= 0) restoredIndex = found;
      }
      set({
        shuffle: false,
        queue: [...originalQueue],
        currentIndex: restoredIndex,
      });
    }

    void setSetting("player_shuffle", String(newShuffle));
  },

  toggleRepeat: () => {
    const { repeat } = get();
    const modes: RepeatMode[] = ["off", "all", "one"];
    const nextIdx = (modes.indexOf(repeat) + 1) % modes.length;
    const newRepeat = modes[nextIdx] ?? "off";

    set({ repeat: newRepeat });
    void setSetting("player_repeat", newRepeat);
  },

  setEq: (band: "bass" | "mid" | "treble", value: number) => {
    const clamped = Math.max(-12, Math.min(12, Math.round(value * 2) / 2));
    const newEq = { ...get().eq, [band]: clamped };
    audioEngine.setEq(band, clamped);
    set({ eq: newEq });
    void setSetting("player_eq", JSON.stringify(newEq));
  },

  resetEq: () => {
    const zeroEq: EqSettings = { bass: 0, mid: 0, treble: 0 };
    audioEngine.setAllEq(zeroEq);
    set({ eq: zeroEq });
    void setSetting("player_eq", JSON.stringify(zeroEq));
  },

  setIsEqOpen: (open: boolean) => {
    set({ isEqOpen: open });
  },

  updateTime: (current: number, duration: number) => {
    set({ currentTime: current, duration: duration || get().duration });
  },

  handleTrackEnded: () => {
    const { repeat } = get();
    if (repeat === "one") {
      get().seek(0);
      void get().play();
    } else {
      void get().next();
    }
  },

  handleTrackError: (errorDetails?: string) => {
    const log = useLogStore.getState().addEntry;
    log("ERR", errorDetails || "Playback error on current track");
    // Automatically skip to next track
    void get().next();
  },
}));
