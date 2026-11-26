import { expect, it, vi } from "vitest";
import { searchTracks, searchWebTracks } from "@/services";
import { useSearchStore } from "./searchStore";

vi.mock("@/services", async original => ({
  ...await original<typeof import("@/services")>(),
  searchTracks: vi.fn().mockResolvedValue([]),
  searchWebTracks: vi.fn(),
}));

it("keeps an obsolete web response from replacing a newer search", async () => {
  const store = useSearchStore.getState();
  let finish!: (items: Awaited<ReturnType<typeof searchWebTracks>>) => void;
  vi.mocked(searchWebTracks).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockRejectedValueOnce(new Error("offline"));
  await store.setQuery("first");
  const pending = store.searchWeb();
  await store.setQuery("second");
  await store.searchWeb();
  finish([{ id: "fixture0001", title: "Old", uploader: "Fixture", duration: 3, thumbnail: null }]);
  await pending;
  expect(useSearchStore.getState()).toMatchObject({ webResults: [], isSearchingWeb: false });
  expect(useSearchStore.getState().webError).toBeTruthy();
});

it("ignores an older local lookup even when the same query is typed again", async () => {
  const store = useSearchStore.getState();
  const onlineCalls = vi.mocked(searchWebTracks).mock.calls.length;
  let finish!: (rows: Awaited<ReturnType<typeof searchTracks>>) => void;
  vi.mocked(searchTracks).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const old = store.setQuery("album");
  await store.setQuery("");
  await store.setQuery("album");
  finish([{ id: 1 } as Awaited<ReturnType<typeof searchTracks>>[number]]);
  await old;
  expect(useSearchStore.getState().localResults).toEqual([]);
  expect(vi.mocked(searchWebTracks)).toHaveBeenCalledTimes(onlineCalls);
});
