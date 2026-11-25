import { beforeEach, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { audioEngine } from "@/services/audioEngine";
import { usePlayerStore } from "./playerStore";
import type { TrackRow } from "@/services/db";

vi.mock("@tauri-apps/api/core", () => ({invoke: vi.fn(), convertFileSrc: (p: string) => p}));
vi.mock("@/services/db", () => ({getSetting: vi.fn(), setSetting: vi.fn()}));
vi.mock("@/services/audioEngine", () => ({
  audioEngine: {pause: vi.fn(), loadAndPlay: vi.fn(), seek: vi.fn()},
}));

const first: TrackRow = { id: 1, title: "First", artist: "Artist", album: "Album", path: "/first.wav", format: "wav", mtime: 0, size: 1, duration_ms: 6000, cover_path: null, track_no: null };
const second = {...first, id: 2, title: "Second", path: "/second.wav"};

beforeEach(() => {
  vi.stubGlobal("navigator", {});
  vi.resetAllMocks();
  usePlayerStore.setState(usePlayerStore.getInitialState());
  vi.mocked(invoke).mockResolvedValue(null);
});

it("keeps separate queue entries for the same track and restores their order", async () => {
  await usePlayerStore.getState().setQueue([first, second]);
  usePlayerStore.getState().enqueue(first);
  await usePlayerStore.getState().playTrack(usePlayerStore.getState().queue[2]!);
  usePlayerStore.getState().toggleShuffle();
  expect(usePlayerStore.getState().queue).toHaveLength(3);
  expect(usePlayerStore.getState().currentIndex).toBe(0);
  usePlayerStore.getState().toggleShuffle();
  expect(usePlayerStore.getState().currentIndex).toBe(2);
  usePlayerStore.getState().removeQueued(usePlayerStore.getState().queue[0]!);
  expect(usePlayerStore.getState().currentIndex).toBe(1);
});

it("stops when all files fail even under repeat all", async () => {
  vi.mocked(audioEngine.loadAndPlay).mockRejectedValue(new Error("unavailable"));
  usePlayerStore.setState({repeat:"all"});
  await usePlayerStore.getState().setQueue([first, second]);
  await vi.waitFor(() => expect(audioEngine.loadAndPlay).toHaveBeenCalledTimes(2));
  expect(usePlayerStore.getState().isPlaying).toBe(false);
  expect(usePlayerStore.getState().currentIndex).toBe(1);
});

it("resumes the newly selected track if paused before its URL arrives", async () => {
  const player = usePlayerStore.getState();
  await player.setQueue([first, second]);
  let resolve!: (url: string) => void;
  vi.mocked(invoke).mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const pending = player.next();
  player.pause();
  await player.play();
  resolve("stale-url");
  await pending;
  expect(audioEngine.loadAndPlay).toHaveBeenLastCalledWith(second.path, 0);
  expect(usePlayerStore.getState().currentTrack?.id).toBe(second.id);
  expect(usePlayerStore.getState().isPlaying).toBe(true);
});

it("bounds seeks at both ends of the track", async () => {
  await usePlayerStore.getState().setQueue([first]);
  for (const [input, expected] of [[-10, 0], [60, 6]] as const) {
    usePlayerStore.getState().seek(input);
    expect(audioEngine.seek).toHaveBeenLastCalledWith(expected);
    expect(usePlayerStore.getState().currentTime).toBe(expected);
  }
});
