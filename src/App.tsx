import { Sidebar } from "./components/layout/Sidebar";
import { MainView } from "./components/layout/MainView";
import { PlayerHud } from "./components/player/PlayerHud";

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainView />
      </div>
      <PlayerHud />
    </div>
  );
}
