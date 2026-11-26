import { DownloadsView } from "@/components/search/DownloadsView";
import { CollectionView } from "@/components/library/CollectionView";
import { TrackList } from "@/components/library/TrackList";
import { usePlayerStore, useAppStore } from "@/stores";
import { LibraryView } from "@/components/library/LibraryView";
import { SearchView } from "@/components/search/SearchView";
import { PlaylistsView } from "@/components/library/PlaylistsView";
import { LyricsView } from "@/components/lyrics/LyricsView";

function QueueView() {
  const tracks = usePlayerStore(s => s.queue);
  const play = usePlayerStore(s => s.playTrack);
  const remove = usePlayerStore(s => s.removeQueued);
  return <section className="flex min-h-0 flex-1 flex-col">
    <h2 className="px-6 py-4 text-lg font-semibold">Queue</h2>
    <TrackList tracks={tracks} queueView showRemove onRemove={remove} onTrackClick={track => void play(track)} />
  </section>;
}

export function MainView() {
  const currentView = useAppStore((s) => s.currentView);

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {(currentView === "home" || currentView === "artists" || currentView === "songs" || currentView === "liked" || currentView === "recent") && <CollectionView key={currentView} view={currentView} />}
      {currentView === "library" && <LibraryView />}
      {currentView === "downloads" && <DownloadsView />}
      {currentView === "search" && <SearchView />}
      {currentView === "playlists" && <PlaylistsView />}
      {currentView === "queue" && <QueueView />}
      {currentView === "lyrics" && <LyricsView />}
    </main>
  );
}
