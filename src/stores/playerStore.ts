import { create } from "zustand";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
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
  enqueue: (track: TrackRow) => void;
  removeQueued: (track: TrackRow) => void;
  setQueue: (newQueue: TrackRow[], startIndex?: number) => Promise<void>;
  togglePlay: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  introEnd: number;
  markIntro: (seconds: number) => void;
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

const pendingSettings = new Map<string, string>();
let savingSettings = false;

async function persistSetting(key: string, value: string): Promise<void> {
  pendingSettings.set(key, value);
  if (savingSettings) return;
  savingSettings = true;
  try {
    for (const [name, latest] of pendingSettings) {
      pendingSettings.delete(name);
      try {
        await setSetting(name, latest);
      } catch (error) {
        useLogStore.getState().addEntry("WARN", `Could not save player settings: ${String(error)}`);
      }
    }
  } finally {
    savingSettings = false;
  }
}

let playbackRequest = 0;
const failedPaths = new Set<string>();

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

      const savedVolume = volStr === null ? NaN : Number(volStr);
      const volume = Number.isFinite(savedVolume) ? Math.max(0, Math.min(1, savedVolume)) : 0.8;
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
    const request = ++playbackRequest;
    audioEngine.pause();
    if (newQueue) failedPaths.clear();
    let {queue, originalQueue} = get();
    if (newQueue) {
      let index = newQueue.indexOf(track);
      if (index < 0) index = newQueue.findIndex(item => item.id === track.id);
      originalQueue = newQueue.map(item => ({ ...item }));
      track = originalQueue[index] ?? { ...track };
      if (index < 0) originalQueue = [track, ...originalQueue];
      queue = get().shuffle ? [track, ...fisherYatesShuffle(originalQueue.filter(item => item !== track))] : [...originalQueue];
    } else if (!queue.includes(track)) {
      track = queue.find(item => item.id === track.id) ?? { ...track };
      if (!queue.includes(track)) {
        originalQueue = [...originalQueue, track];
        queue = [...queue, track];
      }
    }
    const resolvedIndex = queue.indexOf(track);

    set({
      queue,
      originalQueue,
      currentIndex: resolvedIndex,
      currentTrack: track,
      introEnd: 0,
      isPlaying: false,
      currentTime: 0,
      duration: track.duration_ms / 1000,
    });

    try {
      updateMediaSession(track);
      const url = await invoke<string | null>("playback_url", { path: track.path });
      if (request !== playbackRequest) return;
      const key = "intro_" + track.id;
      const marker = await Promise.resolve(getSetting(key)).catch(() => null);
      let saved = Number(marker);
      const videoId = track.path.match(/\[([A-Za-z0-9_-]{11})\]\.mp3$/i)?.[1];
      if (marker == null && videoId && request === playbackRequest) {
        saved = await invoke<number>("lookup_intro", { videoId, duration: track.duration_ms / 1000 }).catch(() => 0);
        if (saved > 0) void persistSetting(key, String(saved));
      }
      if (request !== playbackRequest) return;
      const introEnd = saved > 0 && saved < track.duration_ms / 1000 ? saved : 0;
      set({ introEnd });
      await audioEngine.loadAndPlay(url ?? convertFileSrc(track.path), introEnd);
      if (request !== playbackRequest) return;
      failedPaths.clear();
      set({ isPlaying: true });
    } catch (e) {
      if (request !== playbackRequest) return;
      get().handleTrackError(
        `Failed to play ${track.path}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  },

  enqueue: track => {
    const entry = { ...track };
    set(state => ({ queue: [...state.queue, entry], originalQueue: [...state.originalQueue, entry] }));
  },

  removeQueued: entry => {
    const {queue, originalQueue, currentTrack, currentIndex, isPlaying} = get();
    const remaining = queue.filter(item => item !== entry);
    set({queue: remaining, originalQueue: originalQueue.filter(item => item !== entry),
      currentIndex: currentTrack ? remaining.indexOf(currentTrack) : -1});
    if (currentTrack !== entry) return;
    get().pause();
    set({currentTrack: null, currentTime: 0, duration: 0});
    const next = remaining[Math.min(currentIndex, remaining.length - 1)];
    if (next && isPlaying) void get().playTrack(next);
  },

  setQueue: async (tracks, index = 0) => {
    const track = tracks[index];
    if (track) await get().playTrack(track, tracks);
    else if (tracks.length === 0) {
      get().pause();
      set({queue: [], originalQueue: [], currentTrack: null, currentIndex: -1, currentTime: 0, duration: 0});
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
    if (failedPaths.has(currentTrack.path)) {
      failedPaths.clear();
      await get().playTrack(currentTrack);
      return;
    }
    const request = ++playbackRequest;
    try {
      await audioEngine.play();
      if (request !== playbackRequest) return;
      set({ isPlaying: true });
    } catch (e) {
      if (request !== playbackRequest) return;
      get().handleTrackError(
        `Playback failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  },

  pause: () => {
    ++playbackRequest;
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
        get().seek(get().introEnd);
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
    if (currentTime > get().introEnd + 3) {
      get().seek(get().introEnd);
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

  introEnd: 0,
  markIntro: (seconds) => {
    const { currentTrack, duration } = get();
    if (!currentTrack || !Number.isFinite(seconds) || seconds < 0 || seconds >= duration) return;
    set({ introEnd: seconds });
    void persistSetting("intro_" + currentTrack.id, String(seconds));
  },
  seek: (seconds: number) => {
    audioEngine.seek(seconds);
    set({ currentTime: seconds });
  },

  setVolume: (volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    audioEngine.setVolume(clamped);
    set({ volume: clamped });
    void persistSetting("player_volume", String(clamped));
  },

  toggleShuffle: () => {
    const { shuffle, originalQueue, currentTrack } = get();
    const newShuffle = !shuffle;

    if (newShuffle) {
      // Fisher-Yates with current track staying first
      if (currentTrack) {
        const rest = originalQueue.filter((t) => t !== currentTrack);
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
        const found = originalQueue.indexOf(currentTrack);
        if (found >= 0) restoredIndex = found;
      }
      set({
        shuffle: false,
        queue: [...originalQueue],
        currentIndex: restoredIndex,
      });
    }

    void persistSetting("player_shuffle", String(newShuffle));
  },

  toggleRepeat: () => {
    const { repeat } = get();
    const modes: RepeatMode[] = ["off", "all", "one"];
    const nextIdx = (modes.indexOf(repeat) + 1) % modes.length;
    const newRepeat = modes[nextIdx] ?? "off";

    set({ repeat: newRepeat });
    void persistSetting("player_repeat", newRepeat);
  },

  setEq: (band: "bass" | "mid" | "treble", value: number) => {
    const clamped = Math.max(-12, Math.min(12, Math.round(value * 2) / 2));
    const newEq = { ...get().eq, [band]: clamped };
    audioEngine.setEq(band, clamped);
    set({ eq: newEq });
    void persistSetting("player_eq", JSON.stringify(newEq));
  },

  resetEq: () => {
    const zeroEq: EqSettings = { bass: 0, mid: 0, treble: 0 };
    audioEngine.setAllEq(zeroEq);
    set({ eq: zeroEq });
    void persistSetting("player_eq", JSON.stringify(zeroEq));
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
      get().seek(get().introEnd);
      void get().play();
    } else {
      void get().next();
    }
  },

  handleTrackError: (errorDetails?: string) => {
    const log = useLogStore.getState().addEntry;
    log("ERR", errorDetails || "Playback error on current track");
    const { currentTrack, queue, currentIndex, repeat } = get();
    if (!currentTrack) return;
    failedPaths.add(currentTrack.path);
    const upcoming = queue.slice(currentIndex + 1);
    if (repeat === "all") upcoming.push(...queue.slice(0, currentIndex));
    const next = upcoming.find(track => !failedPaths.has(track.path));
    if (next) {
      void get().playTrack(next);
    } else {
      get().pause();
      log("WARN", "Playback stopped. No playable tracks remain in this queue.");
    }
  },
}));
