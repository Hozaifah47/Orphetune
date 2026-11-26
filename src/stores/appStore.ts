import { create } from "zustand";

export type View = "downloads" | "home" | "artists" | "liked" | "recent" | "songs" | "library" | "search" | "playlists" | "lyrics" | "queue";

interface AppState {
  currentView: View;
  detail: string;
  setView: (view: View, detail?: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: "home",
  detail: "",
  setView: (view, detail = "") => set({ currentView: view, detail }),
}));
