export interface LrcLine {
  id: string;
  time: number; // seconds
  text: string;
}

export interface ParsedLyrics {
  lines: LrcLine[];
  offsetMs: number;
}

/**
 * Parses an LRC (standard and enhanced) synced lyrics string.
 *
 * Handles:
 * - [mm:ss.xx] (2-digit centiseconds) and [mm:ss.xxx] (3-digit milliseconds)
 * - Multiple timestamps on a single line (e.g. [00:12.00][00:24.00]Chorus line)
 * - [offset:ms] tag adjustment
 * - Ignores metadata tags like [ar:...], [ti:...], [al:...], [by:...], etc.
 * - Sorts all resulting lines chronologically
 */
export function parseLrc(lrcText: string): ParsedLyrics {
  if (!lrcText || typeof lrcText !== "string") {
    return { lines: [], offsetMs: 0 };
  }

  let offsetMs = 0;
  const rawEntries: { time: number; text: string }[] = [];

  // Timestamp regex: matches [mm:ss.xx] or [mm:ss.xxx]
  // Group 1: minutes, Group 2: seconds, Group 3: fraction
  const timestampRegex = /\[(\d{1,3}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  // Metadata tag regex: matches [tag:value] where tag contains non-digits
  const offsetRegex = /\[offset:\s*([+-]?\d+)\s*\]/i;
  const metadataRegex = /^\[[a-zA-Z]+:.*\]$/;

  const lines = lrcText.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check for [offset:ms] tag
    const offsetMatch = line.match(offsetRegex);
    if (offsetMatch && offsetMatch[1]) {
      const parsedOffset = parseInt(offsetMatch[1], 10);
      if (!isNaN(parsedOffset)) {
        offsetMs = parsedOffset;
      }
      continue;
    }

    // Check for general metadata tags (without timestamps)
    if (metadataRegex.test(line) && !line.match(timestampRegex)) {
      continue;
    }

    // Extract all timestamps from this line
    const timestamps: number[] = [];
    let match: RegExpExecArray | null;
    timestampRegex.lastIndex = 0;

    while ((match = timestampRegex.exec(line)) !== null) {
      const minStr = match[1] ?? "0";
      const secStr = match[2] ?? "0";
      const fracStr = match[3] ?? "0";

      const mins = parseInt(minStr, 10);
      const secs = parseInt(secStr, 10);
      const fraction = fracStr.length === 3
        ? parseInt(fracStr, 10) / 1000
        : parseInt(fracStr.padEnd(2, "0"), 10) / 100;

      const totalSec = mins * 60 + secs + fraction;
      timestamps.push(totalSec);
    }

    if (timestamps.length === 0) {
      continue;
    }

    // Strip out all timestamps to get the remaining lyric text
    const text = line.replace(timestampRegex, "").trim();

    // Create an entry for each timestamp associated with this text
    for (const time of timestamps) {
      rawEntries.push({ time, text });
    }
  }

  // Apply offset: adjustedTime = time + (offsetMs / 1000)
  const offsetSec = offsetMs / 1000;

  // Sort chronologically
  rawEntries.sort((a, b) => a.time - b.time);

  const parsedLines: LrcLine[] = rawEntries.map((entry, idx) => ({
    id: `lrc-${idx}-${entry.time.toFixed(2)}`,
    time: Math.max(0, entry.time + offsetSec),
    text: entry.text,
  }));

  return {
    lines: parsedLines,
    offsetMs,
  };
}

/**
 * Fast binary search to find the active lyric line index for a given playback time.
 * Returns the index of the latest line whose time <= currentTime, or -1 if before the first line.
 */
export function findActiveLyricIndex(lines: LrcLine[], currentTime: number): number {
  if (lines.length === 0) return -1;
  if (currentTime < lines[0]!.time) return -1;

  let low = 0;
  let high = lines.length - 1;
  let result = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lineTime = lines[mid]!.time;

    if (lineTime <= currentTime) {
      result = mid;
      low = mid + 1; // Look for a later matching line
    } else {
      high = mid - 1;
    }
  }

  return result;
}
