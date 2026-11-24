import { Sidebar } from "./components/layout/Sidebar";
import { MainView } from "./components/layout/MainView";
import { PlayerHud } from "./components/player/PlayerHud";
import { EqModal } from "./components/eq/EqModal";
import { useAudioEngine } from "./hooks/useAudioEngine";

export default function App() {
  useAudioEngine();

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
