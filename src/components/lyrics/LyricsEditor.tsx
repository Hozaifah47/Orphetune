import { useRef, useState } from "react";
import { audioEngine } from "@/services";
import { lyricTimestamp, parseLrc, serializeLrc } from "@/services/lrcParser";
import { invoke } from "@tauri-apps/api/core";

export interface LocalLyrics {
  text: string;
  translation: string;
  offset: number;
}

export function LyricsEditor({initial, onSave, onClose, onReset}: {
  initial: LocalLyrics; onSave:(value:LocalLyrics) => Promise<void>; onClose:() => void; onReset:() => Promise<void>;
}) {
  const [text,setText] = useState(initial.text);
  const [translation,setTranslation] = useState(initial.translation);
  const [offset,setOffset] = useState(initial.offset);
  const [notice,setNotice] = useState("");
  const [busy,setBusy] = useState(false);
  const editor = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  async function run(action: () => Promise<void>) {
    setBusy(true); setNotice("");
    try { await action(); } catch (error) {setNotice(String(error));} finally {setBusy(false);}
  }
  function markLine() {
    const field = editor.current;
    if (!field) return;
    const at = field.selectionStart;
    const start = at ? text.lastIndexOf("\n",at-1)+1 : 0;
    const end = text.indexOf("\n",at);
    const lineEnd = end < 0 ? text.length : end;
    const line = text.slice(start,lineEnd).replace(/^(?:\[\d+:\d+(?:\.\d+)?\])+/,"");
    const marked = "[" + lyricTimestamp(audioEngine.getCurrentTime()) + "]" + line;
    setText(text.slice(0,start) + marked + text.slice(lineEnd));
    requestAnimationFrame(() => { field.focus(); const next = Math.min(field.value.length,start+marked.length+1); field.setSelectionRange(next,next); });
  }
  const timed = parseLrc(text).lines;
  return <section aria-label="Local lyrics editor" className="min-h-0 overflow-auto space-y-3 py-3">
    <div className="flex flex-wrap gap-4 text-sm">
      <button onClick={() => file.current?.click()}>Import LRC or text</button>
      <input ref={file} type="file" accept=".lrc,.txt,text/plain" className="hidden" onChange={e => {
        const selected = e.target.files?.[0]; e.target.value="";
        if (selected) void run(async () => { if(selected.size > 524288) throw Error("Choose a file under 512 KiB."); setText(await selected.text()); });
      }}/>
      <button disabled={!text.trim()} onClick={markLine}>Time line at playhead</button>
      <button disabled={!timed.length || busy} onClick={() => void run(async () => {
        const shifted = timed.map(l => ({...l,time:l.time+offset/1000,words:l.words?.map(w => ({...w,time:w.time+offset/1000}))}));
        if (await invoke<boolean>("export_lyrics",{text:serializeLrc(shifted)})) setNotice("LRC exported.");
      })}>Export LRC</button>
    </div>
    <label className="block text-xs text-muted">Lyrics and timestamps
      <textarea aria-label="Lyrics and timestamps" ref={editor} className="mt-1 block h-40 w-full border border-non-text/40 bg-bg-dark p-2 font-mono text-sm text-white" value={text} onChange={e=>setText(e.target.value)}/></label>
    <label className="block text-xs text-muted">Your translation · one line per lyric
      <textarea aria-label="Your translation" className="mt-1 block h-16 w-full border border-non-text/40 bg-bg-dark p-2 text-white" value={translation} onChange={e=>setTranslation(e.target.value)}/></label>
    <label className="text-sm">Timing shift (ms) <input type="number" step="1" value={offset} onChange={e=>setOffset(Number(e.target.value))}
      className="w-24 border border-non-text/40 bg-bg-dark px-2 py-1"/></label>
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <button disabled={busy || !text.trim()} className="text-bright-red" onClick={() => void run(async () => {
        if(!Number.isSafeInteger(offset) || Math.abs(offset)>3600000) throw Error("Use a timing shift within one hour.");
        if(translation.trim() && translation.trimEnd().split(/\r?\n/).length !== (timed.length || text.split(/\r?\n/).filter(l=>l.trim()).length)) throw Error("Match the number of translation lines to the lyric lines.");
        await onSave({text,translation,offset});
      })}>Save local lyrics</button>
      <button disabled={busy} onClick={onClose}>Cancel</button>
      <button disabled={busy} onClick={() => void run(onReset)}>Restore source lyrics</button>
    </div>
    {notice && <p role="status" className="text-sm text-muted">{notice}</p>}
  </section>;
}
