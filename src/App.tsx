import { useEffect } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { LyricsView } from "./components/lyrics/LyricsView";
import { MainView } from "./components/layout/MainView";
import { PlayerHud } from "./components/player/PlayerHud";
import { EqModal } from "./components/eq/EqModal";
import { useAudioEngine } from "./hooks/useAudioEngine";
import { getYtdlpVersion } from "./services";
import { useCollections } from "./stores/collectionStore";
import { useAppStore, useLibraryStore, useLogStore } from "./stores";

export default function App() {
  useAudioEngine();
  const panel = useAppStore(s => s.currentView === "lyrics" ? "closed" : s.lyricsPanel);

  useEffect(() => {
    void useCollections.getState().load();
    void useLibraryStore.getState().init().catch(error => useLogStore.getState().addEntry("ERR",String(error)));
    void getYtdlpVersion()
      .then((ver) => {
        useLogStore.getState().addEntry("INFO", `yt-dlp version: ${ver}`);
      })
      .catch((err) => {
        useLogStore
          .getState()
          .addEntry("WARN", `yt-dlp sidecar check: ${String(err)}`);
      });
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex flex-1 overflow-hidden">
        <Sidebar />
        <MainView />
        {panel === "side" && <aside aria-label="Lyrics panel" className="absolute inset-y-0 right-0 z-20 flex w-80 border-l border-non-text/30 bg-bg-dark pt-3 xl:static"><LyricsView mode="side"/></aside>}
      </div>
      {panel === "compact" && <LyricsView mode="compact"/>}
      <PlayerHud />
      <EqModal />
    </div>
  );
}
