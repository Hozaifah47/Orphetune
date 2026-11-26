export interface LyricWord {
  time: number;
  text: string;
}

export interface LrcLine extends LyricWord {
  id: string;
  words?: LyricWord[];
}

export interface ParsedLyrics {
  lines: LrcLine[];
  offsetMs: number;
}

function seconds(minutes: string, secs: string, fraction = "") {
  return Number(minutes) * 60 + Number(secs) + Number("0." + fraction);
}

export function parseLrc(source: string): ParsedLyrics {
  if (typeof source !== "string") return { lines: [], offsetMs: 0 };
  const offsetMs = Number(source.match(/^\s*\[offset:\s*([+-]?\d{1,9})\s*\]\s*$/im)?.[1] ?? 0);
  const offset = offsetMs / 1000;
  const lines: LrcLine[] = [];
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    const stamp = /\[(\d{1,3}):([0-5]\d)(?:\.(\d{1,3}))?\]/g;
    const stamps = Array.from(line.matchAll(stamp), m => seconds(m[1]!, m[2]!, m[3]));
    if (!stamps.length) continue;
    const body = line.replace(stamp, "").trim();
    const marker = /<(\d{1,3}):([0-5]\d)(?:\.(\d{1,3}))?>/g;
    const markers = Array.from(body.matchAll(marker));
    const words: LyricWord[] = [];
    const prefix = body.slice(0, markers[0]?.index ?? 0);
    if (prefix) words.push({time: stamps[0]!, text: prefix});
    markers.forEach((m, i) => {
      const text = body.slice(m.index + m[0].length, markers[i + 1]?.index);
      if (text) words.push({time: seconds(m[1]!,m[2]!,m[3]), text});
    });
    const valid = words.length > 0 && words.every((w,i) => w.time >= (words[i-1]?.time ?? stamps[0]!));
    for (const time of stamps) {
      const entry: LrcLine = { id: String(lines.length), time: Math.max(0,time+offset), text: body.replace(marker,"") };
      if (valid) entry.words = words.map(w => ({text:w.text, time:Math.max(0,w.time + (time - stamps[0]!) + offset)}));
      lines.push(entry);
    }
  }
  lines.sort((a,b) => a.time - b.time);
  return {lines, offsetMs};
}

export function findActiveLyricIndex(entries: readonly {time:number}[], position: number): number {
  let low = 0;
  let high = entries.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (entries[mid]!.time <= position) low = mid + 1;
    else high = mid;
  }
  return low - 1;
}

export function lyricTimestamp(time: number): string {
  const ms = Math.round(Math.max(0,time) * 1000);
  return String(Math.floor(ms / 60000)).padStart(2,"0") + ":" +
    String(Math.floor(ms / 1000) % 60).padStart(2,"0") + "." + String(ms % 1000).padStart(3,"0");
}

export function serializeLrc(lines: LrcLine[]): string {
  return lines.map(line => "[" + lyricTimestamp(line.time) + "]" +
    (line.words?.map(w => "<" + lyricTimestamp(w.time) + ">" + w.text).join("") ?? line.text)).join("\n");
}
