import { useEffect, useRef, useState } from "react";
import { History, House, ListEnd, Mic2, Plus } from "lucide-react";
import { useAppStore, usePlaylistStore } from "@/stores";
import type { PlaylistRow } from "@/services/db";

const primary = [
  ["home", "Home", House], ["recent", "Recently played", History],
  ["queue", "Queue", ListEnd], ["lyrics", "Lyrics", Mic2],
] as const;

type Edit = { action: "create" } | { action: "actions" | "rename" | "delete"; playlist: PlaylistRow };

function PlaylistDialog({ edit, close }: { edit: Edit; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [action, setAction] = useState(edit.action);
  const playlist = "playlist" in edit ? edit.playlist : undefined;
  const [name, setName] = useState(playlist?.name ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  useEffect(() => { input.current?.focus(); input.current?.select(); }, [action]);
  const title = action === "actions" ? playlist?.name : action === "create" ? "New playlist" : action === "rename" ? "Rename playlist" : "Delete playlist?";
  async function submit() {
    if (saving) return;
    setSaving(true);
    try {
      const store = usePlaylistStore.getState();
      if (action === "create") await store.createPlaylist(name.trim());
      if (action === "rename" && playlist) await store.renamePlaylist(playlist.id, name.trim());
      if (action === "delete" && playlist) await store.deletePlaylist(playlist.id);
      close();
    } catch (e) { setError(String(e)); setSaving(false); }
  }
  return <dialog ref={ref} onCancel={e => {e.preventDefault(); if (!saving) close();}} aria-labelledby="playlist-dialog-title"
    className="m-auto w-80 max-w-full border border-non-text/40 bg-bg-dark p-5 text-white backdrop:bg-black/60">
    <h2 id="playlist-dialog-title" className="mb-4 break-words text-base font-semibold">{title}</h2>
    {action === "actions" ? <div className="flex gap-4 text-sm">
      <button onClick={() => setAction("rename")}>Rename</button><button onClick={() => setAction("delete")}>Delete</button><button onClick={close}>Cancel</button>
    </div> : <form onSubmit={e => { e.preventDefault(); void submit(); }}>
      {action === "delete" ? <p className="text-sm">Remove “{playlist?.name}” from your playlists? Its songs stay in your library.</p> :
        <label className="block text-sm text-muted">Playlist name<input ref={input} value={name} onChange={e => setName(e.target.value)}
          className="mt-1 block w-full border border-non-text/50 bg-transparent p-2 font-mono text-white" /></label>}
      {error && <p role="alert" className="text-sm text-bright-red">{error}</p>}
      <div className="mt-4 flex justify-end gap-4 text-sm">
        <button type="button" disabled={saving} onClick={close}>Cancel</button>
        <button disabled={saving || (action !== "delete" && !name.trim())} className="text-bright-red disabled:text-muted">
          {action === "delete" ? "Delete" : action === "create" ? "Create" : "Save"}</button>
      </div>
    </form>}
  </dialog>;
}

export function Sidebar() {
  const { currentView, setView } = useAppStore();
  const { playlists, selectPlaylist, selectedPlaylistId, loadPlaylists } = usePlaylistStore();
  const [edit, setEdit] = useState<Edit | null>(null);
  useEffect(() => { void loadPlaylists(); }, [loadPlaylists]);
  return <aside className="flex min-h-0 w-40 shrink-0 flex-col border-r border-non-text/20 py-5 lg:w-48">
    <div className="mb-7 px-5 text-lg font-semibold tracking-wide">Orphetune</div>
    <nav aria-label="Main navigation" className="flex flex-col gap-1 px-2">
      {primary.map(([route,label,Icon]) => {
        const active = currentView === route || (route === "home" && (["songs","library","artists","liked"].includes(currentView) || (currentView === "playlists" && selectedPlaylistId === null)));
        return <button key={route} onClick={() => setView(route)} aria-current={active ? "page" : undefined}
          className={`flex items-center gap-2 whitespace-nowrap px-2 py-2 text-left text-sm lg:gap-3 lg:px-3 hover:text-white ${active ? "text-bright-red" : "text-muted"}`}>
          <Icon size={17}/>{label}</button>;
      })}
    </nav>
    <section aria-labelledby="sidebar-playlists" className="mx-3 mt-4 flex min-h-0 flex-1 flex-col border-t border-non-text/25 pt-3">
      <div className="flex items-center justify-between pl-2"><h2 id="sidebar-playlists" className="text-sm font-semibold">Playlists</h2>
        <button aria-label="Create playlist" title="Create playlist" onClick={() => setEdit({action:"create"})} className="p-2 text-muted hover:text-bright-red"><Plus size={16}/></button></div>
      <div className="overflow-y-auto">
        {[...playlists].sort((a,b) => Number(b.system_key === "downloads") - Number(a.system_key === "downloads")).map(p => {
          const active = currentView === "playlists" && selectedPlaylistId === p.id;
          function actions() { if (!p.system_key) setEdit({action:"actions",playlist:p}); }
          return <button key={p.id} title={p.name} aria-current={active ? "page" : undefined}
            onClick={() => { void selectPlaylist(p.id); setView("playlists"); }}
            onContextMenu={e => { e.preventDefault(); actions(); }}
            onKeyDown={e => { if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {e.preventDefault();actions();} }}
            className={`block w-full truncate px-2 py-2 text-left text-sm hover:text-white ${active ? "text-bright-red" : "text-muted"}`}>{p.name}</button>;
        })}
      </div>
    </section>
    <small className="px-5 pt-4 text-xs text-muted">v0.1.0</small>
    {edit && <PlaylistDialog edit={edit} close={() => setEdit(null)}/>}
  </aside>;
}
