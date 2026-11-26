import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useAppStore, usePlayerStore, useSearchStore } from "@/stores";
import { useCollectionMatches } from "./useCollectionMatches";

export function GlobalSearch() {
  const {query,setQuery,localResults,webResults} = useSearchStore();
  const setView = useAppStore(s => s.setView);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(-1);
  const groups = useCollectionMatches();
  function showResults() { setView("search"); }
  const items = [
    ...localResults.slice(0,4).map(track => ({kind:"Song",label:track.title + " · " + track.artist,
      open:() => void usePlayerStore.getState().playTrack(track, localResults)})),
    ...groups.playlists.slice(0,2), ...groups.artists.slice(0,2), ...groups.albums.slice(0,2),
    ...(webResults.length ? [{kind:"Online",label:`View online results (${webResults.length})`,open:showResults}] : []),
    {kind:"Search",label:"View all results",open:showResults},
  ];
  const visible = open && Boolean(query.trim());
  function close() { setOpen(false); setIndex(-1); }
  function choose(i: number) { close(); items[i]?.open(); }
  useEffect(() => {
    function shortcut(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f" && !document.querySelector("dialog[open]")) {
        e.preventDefault(); input.current?.focus(); input.current?.select(); setOpen(true);
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  return <div className="relative w-full max-w-[420px] min-w-0" onBlur={e => {if (!e.currentTarget.contains(e.relatedTarget)) close();}}>
    <div onClick={() => input.current?.focus()} className="flex cursor-text items-center gap-2 border border-non-text/30 bg-[#190a0a] px-3 text-muted focus-within:border-bright-red">
      <Search size={16} aria-hidden="true"/>
      <input ref={input} role="combobox" aria-label="Search anything" aria-autocomplete="list" autoComplete="off"
        aria-expanded={visible} aria-controls={visible ? "global-suggestions" : undefined}
        aria-activedescendant={visible && index >= 0 ? "suggestion-"+index : undefined}
        placeholder="Search anything…" value={query}
        className="min-w-0 flex-1 bg-transparent py-2 font-mono text-sm text-white placeholder:text-muted focus-visible:outline-none"
        onFocus={() => setOpen(true)} onChange={e => {void setQuery(e.target.value);setOpen(true);setIndex(-1);}}
        onKeyDown={e => {
          if (e.key === "Escape") {e.preventDefault();close();}
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault(); setOpen(true); setIndex(i => e.key === "ArrowDown" ? Math.min(i+1,items.length-1) : Math.max(0,i-1));
          }
          if (e.key === "Enter") {e.preventDefault(); if (visible && index >= 0) choose(index); else {close();showResults();}}
        }}/>
      {query && <button type="button" aria-label="Clear search" onClick={() => {void setQuery("");close();input.current?.focus();}} className="p-1 hover:text-white"><X size={14}/></button>}
    </div>
    {visible && <ul id="global-suggestions" role="listbox" aria-label="Search suggestions"
      className="absolute inset-x-0 top-full z-30 max-h-[50vh] overflow-y-auto border border-non-text/40 bg-[#110505] py-1">
      {items.map((item,i) => <li id={"suggestion-"+i} role="option" aria-selected={index === i} key={item.kind+i}
        ref={node => { if (index === i) node?.scrollIntoView({block:"nearest"}); }}
        onMouseDown={e => e.preventDefault()} onClick={() => choose(i)}
        className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-white/5 ${i === index ? "text-bright-red" : "text-white"}`}>
        <span className="truncate">{item.label}</span><span className="text-xs text-muted">{item.kind}</span></li>)}
    </ul>}
  </div>;
}
