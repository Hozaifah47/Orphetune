import { create } from "zustand";

export type View = "downloads" | "home" | "artists" | "liked" | "recent" | "songs" | "library" | "search" | "playlists" | "lyrics" | "queue";

interface AppState {
  currentView: View;
  detail: string;
  lyricsPanel: "closed" | "side" | "compact";
  setLyricsPanel: (panel: AppState["lyricsPanel"]) => void;
  setView: (view: View, detail?: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: "home",
  detail: "",
  lyricsPanel: "closed",
  setLyricsPanel: lyricsPanel => set({lyricsPanel}),
  setView: (view, detail = "") => set({ currentView: view, detail }),
}));
