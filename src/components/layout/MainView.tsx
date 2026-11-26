import { GlobalSearch } from "@/components/search/GlobalSearch";
import { DownloadsView } from "@/components/search/DownloadsView";
import { CollectionView } from "@/components/library/CollectionView";
import { TrackList } from "@/components/library/TrackList";
import { usePlayerStore, useAppStore, usePlaylistStore, useSearchStore } from "@/stores";
import { LibraryView } from "@/components/library/LibraryView";
import { SearchView } from "@/components/search/SearchView";
import { PlaylistsView } from "@/components/library/PlaylistsView";
import { LyricsView } from "@/components/lyrics/LyricsView";

function QueueView() {
  const tracks = usePlayerStore(s => s.queue);
  const play = usePlayerStore(s => s.playTrack);
  const remove = usePlayerStore(s => s.removeQueued);
  return <section className="flex min-h-0 flex-1 flex-col">
    <TrackList tracks={tracks} queueView showRemove onRemove={remove} onTrackClick={track => void play(track)} />
  </section>;
}

const categories = [["songs","Songs"],["library","Albums"],["artists","Artists"],["liked","Liked songs"],["playlists","Playlists"]] as const;
const titles = {home:"Home",songs:"Songs",library:"Albums",artists:"Artists",liked:"Liked songs",playlists:"Playlists",queue:"Queue",lyrics:"Lyrics",recent:"Recently played",downloads:"Download activity",search:"Search"};

export function MainView() {
  const query = useSearchStore(s => s.query);
  const currentView = useAppStore((s) => s.currentView);

  const { playlists, selectedPlaylistId, selectPlaylist } = usePlaylistStore();
  const selected = currentView === "playlists" ? playlists.find(p => p.id === selectedPlaylistId) : undefined;
  const collection = !selected && (currentView === "home" || categories.some(([v]) => v === currentView));
  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-6 px-5 py-4 lg:px-6">
        <h1 className="min-w-24 truncate text-xl font-semibold" title={selected?.name}>{selected?.name ?? titles[currentView]}</h1>
        <GlobalSearch/>
      </header>
      {collection && <nav aria-label="Home categories" className="mb-2 flex shrink-0 flex-wrap gap-x-5 px-5 lg:px-6">
        {categories.map(([v,label]) => <button key={v} aria-current={v === currentView ? "page" : undefined}
          className={`border-b-2 py-2 text-sm hover:text-white ${v === currentView ? "border-crimson text-bright-red" : "border-transparent text-muted"}`}
          onClick={() => {if (v === "playlists") void selectPlaylist(null);useAppStore.getState().setView(v);}}>{label}</button>)}
      </nav>}
      {(currentView === "home" || currentView === "artists" || currentView === "songs" || currentView === "liked" || currentView === "recent") && <CollectionView key={currentView} view={currentView} />}
      {currentView === "library" && <LibraryView />}
      {currentView === "downloads" && <DownloadsView />}
      {currentView === "search" && <SearchView key={query} />}
      {currentView === "playlists" && <PlaylistsView />}
      {currentView === "queue" && <QueueView />}
      {currentView === "lyrics" && <LyricsView />}
    </main>
  );
}
