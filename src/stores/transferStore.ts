import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SourceSelection, WebSearchResult } from "@/services/tauriCommands";
import { useSearchStore } from "./searchStore";

interface Job {
  item: WebSearchResult;
  source?: SourceSelection;
  state: "queued" | "active" | "interrupted" | "complete" | "error" | "cancelled";
  detail?: string;
  path?: string;
}

interface Transfers {
  jobs: Job[];
  concurrency: number;
  enqueue: (items: WebSearchResult[], source?: SourceSelection) => void;
  dismiss: (id: string) => void;
  retry: (id: string) => void;
  cancel: (id: string) => void;
  moveUp: (id: string) => void;
  setConcurrency: (count: number) => void;
}

function update(id: string, changes: Partial<Job>) {
  useTransfers.setState(s => ({ jobs: s.jobs.map(j => j.item.id === id ? { ...j, ...changes } : j) }));
}

function pump() {
  const { jobs, concurrency } = useTransfers.getState();
  const active = jobs.filter(j => j.state === "active").length;
  const capacity = Math.max(0, concurrency - active);
  for (const job of jobs.filter(j => j.state === "queued").slice(0, capacity)) {
    update(job.item.id, { state: "active" });
    void useSearchStore.getState().triggerDownload(job.item, job.source).then(() => {
      const result = useSearchStore.getState().downloads[job.item.id];
      update(job.item.id, {
        state: result?.status === "complete" ? "complete" : result?.status === "cancelled" ? "cancelled" : "error",
        detail: result?.error,
        path: result?.path,
      });
    }).catch(error => update(job.item.id, { state: "error", detail: String(error) })).finally(pump);
  }
}

export const useTransfers = create<Transfers>()(persist((set) => ({
  jobs: [],
  concurrency: 1,
  enqueue(items, source) {
    set(s => {
      const jobs = [...s.jobs];
      const ids = new Set(jobs.map(j => j.item.id));
      for (const item of items) {
        if (ids.has(item.id)) continue;
        jobs.push({ item, source, state: "queued" });
        ids.add(item.id);
      }
      return { jobs };
    });
    pump();
  },
  dismiss(id) {
    set(s => ({ jobs: s.jobs.filter(j => j.item.id !== id || j.state === "active" || j.state === "queued") }));
  },
  retry(id) {
    if (!useTransfers.getState().jobs.some(j => j.item.id === id && ["interrupted", "cancelled", "error"].includes(j.state))) return;
    update(id, { state: "queued", detail: undefined });
    pump();
  },
  cancel(id) {
    const job = useTransfers.getState().jobs.find(j => j.item.id === id);
    if (job?.state === "active") void useSearchStore.getState().cancelActiveDownload(id);
    if (job?.state === "queued") update(id, { state: "cancelled" });
  },
  moveUp(id) {
    set(s => {
      const jobs = [...s.jobs];
      const i = jobs.findIndex(j => j.item.id === id && j.state === "queued");
      const previous = jobs.slice(0, i).map(j => j.state).lastIndexOf("queued");
      if (i < 0 || previous < 0) return s;
      [jobs[i], jobs[previous]] = [jobs[previous]!, jobs[i]!];
      return { jobs };
    });
  },
  setConcurrency(count) {
    if (!Number.isInteger(count) || count < 1 || count > 3) return;
    set({ concurrency: count });
    pump();
  },
}), {
  name: "orphetune-transfers-v1",
  merge(saved, current) {
    const data = saved as Partial<Transfers> | undefined;
    return { ...current, concurrency: [1, 2, 3].includes(data?.concurrency ?? 0) ? data!.concurrency! : 1,
      jobs: (data?.jobs ?? []).map(job => job.state === "active" || job.state === "queued" ? { ...job, state: "interrupted" as const } : job) };
  },
}));
