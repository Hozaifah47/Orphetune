import { useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { Download, House, Users, Heart, History, Disc3, Library, Search, ListMusic, Mic2, ListEnd } from "lucide-react";
import { useAppStore, usePlaylistStore } from "@/stores";
import type { View } from "@/stores";

interface NavItem {
  view: View;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { view: "home", label: "Home", icon: House },
  { view: "songs", label: "Songs", icon: Library },
  { view: "library", label: "Albums", icon: Disc3 },
  { view: "artists", label: "Artists", icon: Users },
  { view: "liked", label: "Liked songs", icon: Heart },
  { view: "recent", label: "Recently played", icon: History },
  { view: "downloads", label: "Downloads", icon: Download },
  { view: "search", label: "Search", icon: Search },
  { view: "playlists", label: "Playlists", icon: ListMusic },
  { view: "queue", label: "Queue", icon: ListEnd },
  { view: "lyrics", label: "Lyrics", icon: Mic2 },
];

export function Sidebar() {
  const currentView = useAppStore((s) => s.currentView);
  const setView = useAppStore((s) => s.setView);
  const playlists = usePlaylistStore((s) => s.playlists);
  const selectPlaylist = usePlaylistStore((s) => s.selectPlaylist);
  const loadPlaylists = usePlaylistStore((s) => s.loadPlaylists);

  useEffect(() => {
    void loadPlaylists();
  }, [loadPlaylists]);

  return (
    <aside className="flex h-full overflow-y-auto w-48 shrink-0 flex-col border-r border-non-text/20 py-6">
      <div className="mb-8 px-5">
        <h1 className="font-sans text-lg font-semibold tracking-wide text-white">
          Orphetune
        </h1>
      </div>

      <nav aria-label="Main navigation" className="flex flex-col gap-1 px-2">
        {NAV_ITEMS.map(({ view, label, icon: Icon }) => {
          const isActive = currentView === view;
          return (
            <button
              key={view}
              onClick={() => setView(view)}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2 text-sm font-sans transition-fast text-left ${
                isActive
                  ? "text-bright-red font-bold bg-white/5"
                  : "text-muted hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Playlist shortcuts */}
      {playlists.length > 0 && (
        <div className="mt-6 flex flex-col gap-0.5 px-2">
          <p className="px-3 pb-1 font-sans text-[10px] font-medium uppercase tracking-wider text-muted">
            Playlists
          </p>
          {playlists.slice(0, 8).map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setView("playlists");
                void selectPlaylist(p.id);
              }}
              className="truncate px-3 py-1 text-left font-sans text-xs text-muted transition-fast hover:text-white"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-auto px-5 pb-2">
        <p className="font-sans text-xs text-muted">v0.1.0</p>
      </div>
    </aside>
  );
}
