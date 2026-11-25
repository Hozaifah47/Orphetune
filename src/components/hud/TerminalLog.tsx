import { useRef, useEffect } from "react";
import { useLogStore } from "@/stores";
import type { LogEntry } from "@/stores";

const LEVEL_COLORS: Record<LogEntry["level"], string> = {
  INFO: "text-muted",
  FETCH: "text-bright-red",
  WARN: "text-white",
  ERR: "text-bright-red",
};

const MAX_VISIBLE = 6;

export function TerminalLog() {
  const entries = useLogStore((s) => s.entries);
  const scrollRef = useRef<HTMLDivElement>(null);
  const visibleEntries = entries.slice(-MAX_VISIBLE);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  if (visibleEntries.length === 0) return <p className="text-xs text-muted">No recent events</p>;

  return (
    <div
      ref={scrollRef}
      role="log"
      aria-live="polite"
      aria-label="Terminal log"
      className="flex flex-col gap-0.5 overflow-hidden font-mono text-xs"
    >
      {visibleEntries.map((entry) => (
        <div key={entry.id} className="flex gap-2 leading-5">
          <span className={`shrink-0 ${LEVEL_COLORS[entry.level]}`}>
            [{entry.level}]
          </span>
          <span className="min-w-0 break-words text-muted">{entry.message}</span>
        </div>
      ))}
    </div>
  );
}
