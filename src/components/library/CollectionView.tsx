import { useMemo, useState } from "react";
import { useAppStore, useLibraryStore, usePlayerStore, usePlaylistStore } from "@/stores";
import { useCollections } from "@/stores/collectionStore";
import { TrackList } from "./TrackList";

const headings = { home: "Home", liked: "Liked songs", recent: "Recently played", artists: "Artists", songs: "Songs" };

export function CollectionView({view}: {view: keyof typeof headings}) {
  const tracks = useLibraryStore(s => s.tracks);
  const folder = useLibraryStore(s => s.libraryPath);
  const pickFolder = useLibraryStore(s => s.pickFolder);
  const play = usePlayerStore(s => s.playTrack);
  const enqueue = usePlayerStore(s => s.enqueueMany);
  const playlists = usePlaylistStore(s => s.playlists);
  const { liked, recent, setLiked, addToPlaylist } = useCollections();
  const artist = useAppStore(s => view === "artists" ? s.detail : "");
  const setArtist = (name: string) => useAppStore.getState().setView("artists", name);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(new Set<number>());
  const [notice, setNotice] = useState("");
  const [playlistMenu, setPlaylistMenu] = useState(false);
  const byId = useMemo(() => new Map(tracks.map(t => [t.id, t])), [tracks]);
  const artists = useMemo(() => view === "artists" ? Array.from(new Set(tracks.map(t => t.artist))).sort((a,b) => a.localeCompare(b)) : [], [tracks, view]);
  const list = useMemo(() => {
    let result = tracks;
    if (view === "liked") result = tracks.filter(t => liked.has(t.id));
    if (view === "recent" || view === "home") {
      result = recent.flatMap(id => byId.get(id) ?? []);
      if (view === "home") result = result.length ? result.slice(0,12) : [...tracks].sort((a,b) => b.id-a.id).slice(0,12);
    }
    if (artist) result = result.filter(t => t.artist === artist);
    const query = filter.trim().toLocaleLowerCase();
    return query ? result.filter(t => [t.title,t.artist,t.album].some(v => v.toLocaleLowerCase().includes(query))) : result;
  }, [tracks, view, liked, recent, byId, filter, artist]);
  const ids = list.filter(t => selected.has(t.id)).map(t => t.id);
  function toggle(id: number) {
    setSelected(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    setNotice("");
  }
  function clear() { setSelected(new Set()); setPlaylistMenu(false); }
  const button = "px-2 py-1 text-sm text-muted hover:text-white focus-visible:outline";
  return <section className="flex min-h-0 flex-1 flex-col">
    {view !== "home" && <header className="flex flex-wrap items-center gap-3 px-6 py-4">
      {artist && <button className={button} onClick={() => {setArtist("");clear();}}>All artists</button>}
      {artist && <h2 className="text-lg font-semibold">{artist}</h2>}
      <input aria-label={`Filter ${headings[view]}`} placeholder="Filter…" value={filter}
        className="ml-auto border-b border-non-text/40 bg-transparent px-2 py-1" onChange={e => {setFilter(e.target.value);clear();}} />
    </header>}
    {view === "home" && <div className="px-6 pb-3">
      {list.length > 0 && <h3>{recent.length ? "Recently played" : "Recently added"}</h3>}
      {!folder && <button className={button} onClick={() => void pickFolder()}>Choose music folder</button>}
    </div>}
    {view === "artists" && !artist ? <div className="overflow-auto px-6">
      {artists.filter(a => a.toLocaleLowerCase().includes(filter.toLocaleLowerCase())).map(a =>
        <button className="block w-full py-2 text-left hover:text-bright-red" key={a} onClick={() => {setArtist(a);setFilter("");}}>{a}</button>)}
    </div> : <>
      {ids.length > 0 && <div className="flex flex-wrap items-center gap-1 border-y border-non-text/20 px-4 py-1">
        <span className="text-xs">{ids.length} selected</span>
        <button className={button} onClick={() => {void setLiked(ids,!ids.every(id=>liked.has(id)));clear();}}>{ids.every(id=>liked.has(id)) ? "Unlike" : "Like"}</button>
        <button className={button} onClick={() => {enqueue(list.filter(t => selected.has(t.id)));setNotice("Added to queue");clear();}}>Queue</button>
        {playlists.some(p => !p.system_key) && <button className={button} onClick={() => setPlaylistMenu(!playlistMenu)}>Add to playlist</button>}
        {playlistMenu && playlists.filter(p=>!p.system_key).map(p => <button key={p.id} className={button} onClick={async () => {
          try { await addToPlaylist(ids,p.id);setNotice(`Added to ${p.name}`);clear(); } catch {setNotice("Could not save playlist");}
        }}>{p.name}</button>)}
        <button className={button} onClick={clear}>Clear selection</button>
      </div>}
      {notice && <p role="status" className="px-6 text-xs">{notice}</p>}
      <TrackList tracks={list} selectedIds={selected} onSelect={toggle} onActions={id => {if (!selected.has(id)) setSelected(new Set([id])); setPlaylistMenu(true);}}
        onTrackClick={track => void play(track,list)} />
    </>}
  </section>;
}
