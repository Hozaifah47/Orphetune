import { useAppStore } from "@/stores";
import { LibraryView } from "@/components/library/LibraryView";
import { SearchView } from "@/components/search/SearchView";
import { PlaylistsView } from "@/components/library/PlaylistsView";
import { LyricsView } from "@/components/lyrics/LyricsView";

export function MainView() {
  const currentView = useAppStore((s) => s.currentView);

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {currentView === "library" && <LibraryView />}
      {currentView === "search" && <SearchView />}
      {currentView === "playlists" && <PlaylistsView />}
      {currentView === "lyrics" && <LyricsView />}
    </main>
  );
}
