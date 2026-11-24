import { FolderOpen } from "lucide-react";

export function LibraryView() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <FolderOpen size={48} className="text-non-text" />
      <p className="font-sans text-sm text-muted">
        Select a folder to scan your music library
      </p>
      <button className="bg-crimson px-4 py-2 font-sans text-sm text-white transition-fast hover:bg-bright-red">
        Choose folder
      </button>
    </div>
  );
}
