import { useEffect, useRef } from "react";
import { audioEngine } from "@/services/audioEngine";
import { usePlayerStore } from "@/stores/playerStore";

/**
 * useAudioEngine
 *
 * Initializes audio context on first gesture, tracks playback progress,
 * and synchronizes audio engine state with the Zustand player store.
 */
export function useAudioEngine() {
  const initSettings = usePlayerStore((s) => s.initSettings);
  const updateTime = usePlayerStore((s) => s.updateTime);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const animFrameRef = useRef<number | null>(null);

  // Initialize persisted settings and engine callbacks on mount
  useEffect(() => {
    void initSettings();

    // Unlock AudioContext on first user interaction
    const unlockAudio = () => {
      void audioEngine.ensureContext();
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [initSettings]);

  // High precision time tracker loop using requestAnimationFrame when playing
  useEffect(() => {
    const tick = () => {
      const cur = audioEngine.getCurrentTime();
      const dur = audioEngine.getDuration();
      updateTime(cur, dur);
      animFrameRef.current = requestAnimationFrame(tick);
    };

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      // One sync when paused
      const cur = audioEngine.getCurrentTime();
      const dur = audioEngine.getDuration();
      updateTime(cur, dur);
    }

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPlaying, updateTime]);
}
