import { Search } from "lucide-react";

export function SearchView() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div className="flex items-center gap-2 border-b border-non-text/20 pb-2">
        <Search size={18} className="text-muted" />
        <input
          type="text"
          placeholder="Search local or web..."
          aria-label="Search"
          className="flex-1 bg-transparent font-mono text-sm text-white placeholder:text-non-text focus:outline-none"
        />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <p className="font-sans text-sm text-muted">
          Type to search your library
        </p>
      </div>
    </div>
  );
}
