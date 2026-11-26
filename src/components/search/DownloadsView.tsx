import { useTransfers } from "@/stores/transferStore";
import { useSearchStore } from "@/stores";

export function DownloadsView() {
  const {jobs, concurrency, setConcurrency, moveUp, retry, cancel, dismiss} = useTransfers();
  const progress = useSearchStore(s => s.downloads);
  const firstQueued = jobs.find(j => j.state === "queued");
  return <section className="overflow-y-auto p-6">

    <label className="text-sm">Simultaneous transfers <select className="bg-bg-dark p-1 text-white" value={concurrency}
      onChange={e => setConcurrency(Number(e.target.value))}>{[1,2,3].map(n => <option key={n}>{n}</option>)}</select></label>
    {!jobs.length && <p className="mt-4 text-sm text-muted">Download a track from Search to see its progress here.</p>}
    {jobs.map(job => {
      const id = job.item.id;
      const live = progress[id];
      const stage = job.state === "active" ? live?.status ?? "starting" : job.state;
      const metrics = stage === "downloading" ? live?.metrics : undefined;
      return <article key={id} className="border-b border-non-text/30 py-3">
        <h3 className="text-sm">{job.item.title}</h3>
        <p className="break-all text-xs text-muted">{stage} · {job.source?.ext.toUpperCase() ?? "MP3"} {stage === "downloading" && live?.percent != null && Math.floor(live.percent) + "%"} {job.detail ?? job.path}</p>
        {metrics && <p className="text-xs text-muted">{[
          metrics.bytes != null && (metrics.bytes / 1048576).toFixed(1) + " MiB received",
          metrics.total != null && (metrics.total / 1048576).toFixed(1) + " MiB expected",
          metrics.speed != null && Math.round(metrics.speed / 1024) + " KiB/s",
          metrics.eta != null && metrics.eta + " s remaining",
        ].filter(Boolean).join(" · ")}</p>}
        <div className="flex gap-4 pt-1 text-sm">
          {job.state === "queued" && job !== firstQueued && <button onClick={() => moveUp(id)}>Move up</button>}
          {(job.state === "queued" || stage === "downloading") && <button onClick={() => cancel(id)}>Cancel</button>}
          {job.state !== "active" && job.state !== "queued" && <button onClick={() => dismiss(id)}>Clear from history</button>}
          {["error","cancelled","interrupted"].includes(job.state) && <button onClick={() => retry(id)}>Retry</button>}
        </div>
      </article>;
    })}
  </section>;
}
