import { create } from "zustand";

export type View = "home" | "artists" | "liked" | "recent" | "songs" | "library" | "search" | "playlists" | "lyrics" | "queue";

interface AppState {
  currentView: View;
  setView: (view: View) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: "home",
  setView: (view) => set({ currentView: view }),
}));
