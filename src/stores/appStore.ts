import { create } from "zustand";

export type View = "library" | "search" | "playlists" | "lyrics";

interface AppState {
  currentView: View;
  setView: (view: View) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: "library",
  setView: (view) => set({ currentView: view }),
}));
