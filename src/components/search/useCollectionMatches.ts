import { useMemo } from "react";
import { useAppStore, useLibraryStore, usePlaylistStore, useSearchStore } from "@/stores";

export function useCollectionMatches() {
  const albums = useLibraryStore(s => s.albums);
  const playlists = usePlaylistStore(s => s.playlists);
  const query = useSearchStore(s => s.query);
  return useMemo(() => {
    const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    const matches = (name: string) => words.length > 0 && words.every(word => name.toLocaleLowerCase().includes(word));
    const open = useAppStore.getState().setView;
    return {
      playlists: playlists.filter(p => matches(p.name)).map(p => ({key:p.id,label:p.name, kind:"Playlist", open:() => {
        void usePlaylistStore.getState().selectPlaylist(p.id); open("playlists");
      }})),
      artists: Array.from(new Set(albums.map(a => a.artist).filter(matches))).map(name =>
        ({key:name,label:name, kind:"Artist", open:() => open("artists",name)})),
      albums: albums.filter(a => matches(a.name)).map(a => ({key:a.key,label:a.name + " · " + a.artist, kind:"Album", open:() => open("library",a.key)})),
    };
  }, [query, albums, playlists]);
}
