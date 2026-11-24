import { create } from "zustand";

export interface LogEntry {
  id: string;
  level: "INFO" | "FETCH" | "WARN" | "ERR";
  message: string;
  timestamp: number;
}

interface LogState {
  entries: LogEntry[];
  addEntry: (level: LogEntry["level"], message: string) => void;
  clearEntries: () => void;
}

let logId = 0;

export const useLogStore = create<LogState>((set) => ({
  entries: [],
  addEntry: (level, message) =>
    set((state) => ({
      entries: [
        ...state.entries.slice(-99),
        {
          id: `log-${++logId}`,
          level,
          message,
          timestamp: Date.now(),
        },
      ],
    })),
  clearEntries: () => set({ entries: [] }),
}));
