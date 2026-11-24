import { ListMusic } from "lucide-react";

export function PlaylistsView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <ListMusic size={48} className="text-non-text" />
      <p className="font-sans text-sm text-muted">No playlists yet</p>
    </div>
  );
}
