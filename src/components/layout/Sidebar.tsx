import type { LucideIcon } from "lucide-react";
import { Library, Search, ListMusic, Mic2 } from "lucide-react";
import { useAppStore } from "@/stores";
import type { View } from "@/stores";

interface NavItem {
  view: View;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { view: "library", label: "Library", icon: Library },
  { view: "search", label: "Search", icon: Search },
  { view: "playlists", label: "Playlists", icon: ListMusic },
  { view: "lyrics", label: "Lyrics", icon: Mic2 },
];

export function Sidebar() {
  const currentView = useAppStore((s) => s.currentView);
  const setView = useAppStore((s) => s.setView);

  return (
    <aside className="flex h-full w-48 shrink-0 flex-col border-r border-non-text/20 py-6">
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
                  ? "text-bright-red bg-white/5"
                  : "text-muted hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-5 pb-2">
        <p className="font-mono text-[10px] text-non-text">v0.1.0</p>
      </div>
    </aside>
  );
}
