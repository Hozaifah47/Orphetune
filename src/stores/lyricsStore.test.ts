import { beforeEach, expect, it, vi } from "vitest";
import { useLyricsStore } from "./lyricsStore";
import { fetchLyrics, getCachedLyrics, saveLyrics, type TrackRow } from "@/services";

vi.mock("@/services", async (original) => ({
  ...await original<typeof import("@/services")>(),
  getCachedLyrics: vi.fn(), fetchLyrics: vi.fn(), saveLyrics: vi.fn(),
}));

const track: TrackRow = { id: 1, title: "First", artist: "Artist", album: "Album",
  path: "/first.wav", format: "wav", mtime: 0, size: 1, duration_ms: 6000, cover_path: null, track_no: null };

beforeEach(() => {
  vi.resetAllMocks();
  useLyricsStore.getState().clear();
  vi.mocked(getCachedLyrics).mockResolvedValue(null);
});

it("keeps lyrics for the latest selection when an older request finishes", async () => {
  let finish!: (data: Awaited<ReturnType<typeof fetchLyrics>>) => void;
  vi.mocked(fetchLyrics).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValueOnce({ synced: null, plain: "second", instrumental: false });
  const first = useLyricsStore.getState().loadLyricsForTrack(track);
  await vi.waitFor(() => expect(fetchLyrics).toHaveBeenCalledTimes(1));
  await useLyricsStore.getState().loadLyricsForTrack({ ...track, id: 2 });
  finish({ synced: null, plain: "first", instrumental: false });
  await first;
  expect(useLyricsStore.getState().plainLyrics).toBe("second");
});

it("loads offline lyrics and preserves them through a failed refresh", async () => {
  vi.mocked(getCachedLyrics).mockResolvedValue({ track_id: 1, synced: null, plain: "cached", instrumental: 0, fetched_at: 1 });
  await useLyricsStore.getState().loadLyricsForTrack(track);
  expect(fetchLyrics).not.toHaveBeenCalled();
  vi.mocked(fetchLyrics).mockRejectedValue(new Error("offline"));
  await useLyricsStore.getState().loadLyricsForTrack(track, true);
  expect(useLyricsStore.getState()).toMatchObject({ plainLyrics: "cached", notFound: false, isLoading: false });
  expect(saveLyrics).not.toHaveBeenCalled();
});

it("displays fetched timed lyrics even if SQLite cannot save them", async () => {
  vi.mocked(fetchLyrics).mockResolvedValue({ synced: "[00:03.50]Fixture", plain: null, instrumental: false });
  vi.mocked(saveLyrics).mockRejectedValue(new Error("disk full"));
  await useLyricsStore.getState().loadLyricsForTrack(track);
  expect(useLyricsStore.getState().lyrics?.lines[0]?.time).toBe(3.5);
  expect(useLyricsStore.getState().isLoading).toBe(false);
});

it("preserves the saved version when refresh finds no match", async () => {
  vi.mocked(getCachedLyrics).mockResolvedValue({ track_id: 1, synced: null, plain: "cached", instrumental: 0, fetched_at: 1 });
  await useLyricsStore.getState().loadLyricsForTrack(track);
  vi.mocked(fetchLyrics).mockResolvedValue({ synced: null, plain: null, instrumental: false });
  await useLyricsStore.getState().loadLyricsForTrack(track, true);
  expect(useLyricsStore.getState()).toMatchObject({ plainLyrics: "cached", isLoading: false, notFound: false });
  expect(saveLyrics).not.toHaveBeenCalled();
});
