import { Mic2 } from "lucide-react";

export function LyricsView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <Mic2 size={48} className="text-non-text" />
      <p className="font-sans text-sm text-muted">
        Play a track to see lyrics
      </p>
    </div>
  );
}
