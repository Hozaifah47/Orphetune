import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SourceSelection } from "@/services/tauriCommands";

interface Format {
  format_id: string;
  acodec: string;
  ext: string;
  abr?: number;
  asr?: number;
  audio_channels?: number;
  filesize?: number;
  filesize_approx?: number;
}

export function SourceFormats({ id, choose }: { id: string; choose: (source: SourceSelection) => void }) {
  const [formats, setFormats] = useState<Format[]>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      setFormats(await invoke<Format[]>("source_formats", {videoId: id}));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }
  return <div className="text-xs text-muted">
    <button disabled={loading} onClick={() => formats ? setFormats(undefined) : void load()} className="hover:text-white">
      {loading ? "Checking YouTube…" : formats ? "Hide formats" : "Original formats"}
    </button>
    {error && <p role="alert">{error}</p>}
    {formats?.length === 0 && <p>No supported original audio format is available.</p>}
    {formats?.map(f => {
      const size = f.filesize ?? f.filesize_approx;
      const details = [f.ext === "flac" && f.acodec === "flac" ? "FLAC (lossless)" : f.ext.toUpperCase(), f.acodec, f.abr && Math.round(f.abr) + " kbps", f.asr && f.asr / 1000 + " kHz",
        f.audio_channels && f.audio_channels + " ch", size && (f.filesize ? "" : "~") + (size / 1048576).toFixed(1) + " MiB"].filter(Boolean);
      return <button key={f.format_id} className="block py-2 text-left text-white hover:underline"
        onClick={() => choose({ id: f.format_id, ext: f.ext })}>Download original · {details.join(" · ")}</button>;
    })}
  </div>;
}
