import { useEffect } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { MainView } from "./components/layout/MainView";
import { PlayerHud } from "./components/player/PlayerHud";
import { EqModal } from "./components/eq/EqModal";
import { useAudioEngine } from "./hooks/useAudioEngine";
import { getYtdlpVersion } from "./services";
import { useCollections } from "./stores/collectionStore";
import { useLibraryStore, useLogStore } from "./stores";

export default function App() {
  useAudioEngine();

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
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainView />
      </div>
      <PlayerHud />
      <EqModal />
    </div>
  );
}
