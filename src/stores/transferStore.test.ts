import { expect, it, vi } from "vitest";
import { useTransfers } from "./transferStore";
import { useSearchStore } from "./searchStore";

it("continues a reordered batch after a failed item and skips duplicate requests", async () => {
  const completions = new Map<string, () => void>();
  const order: string[] = [];
  vi.spyOn(useSearchStore.getState(), "triggerDownload").mockImplementation(item => {
    order.push(item.id);
    return new Promise(resolve => completions.set(item.id, () => {
      useSearchStore.setState(s => ({ downloads: { ...s.downloads,
        [item.id]: {videoId: item.id, status: item.id === "a" ? "error" : "complete"} } }));
      resolve();
    }));
  });
  const items = ["a","b","c","a"].map(id => ({id, title:id, uploader:"", duration:0, thumbnail:null}));
  const store = useTransfers.getState();
  store.enqueue(items);
  store.moveUp("c");
  expect(order).toEqual(["a"]);
  completions.get("a")!();
  await vi.waitFor(() => expect(order).toEqual(["a","c"]));
  store.cancel("b");
  completions.get("c")!();
  await vi.waitFor(() => expect(useTransfers.getState().jobs.map(j => j.state)).toEqual(["error","complete","cancelled"]));
  vi.restoreAllMocks();
});
