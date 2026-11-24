import { describe, it, expect } from "vitest";
import { parseLrc, findActiveLyricIndex } from "./lrcParser";

describe("parseLrc", () => {
  it("handles basic [mm:ss.xx] centiseconds timestamps", () => {
    const lrc = `
[00:05.50]First line of lyrics
[01:10.25]Second line of lyrics
    `;
    const result = parseLrc(lrc);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]?.time).toBeCloseTo(5.5, 2);
    expect(result.lines[0]?.text).toBe("First line of lyrics");
    expect(result.lines[1]?.time).toBeCloseTo(70.25, 2);
    expect(result.lines[1]?.text).toBe("Second line of lyrics");
  });

  it("handles [mm:ss.xxx] millisecond timestamps", () => {
    const lrc = `
[00:15.123]High precision timestamp line
[02:00.850]Another millisecond line
    `;
    const result = parseLrc(lrc);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]?.time).toBeCloseTo(15.123, 3);
    expect(result.lines[0]?.text).toBe("High precision timestamp line");
    expect(result.lines[1]?.time).toBeCloseTo(120.85, 2);
  });

  it("handles multiple timestamps per line and sorts them chronologically", () => {
    const lrc = `
[00:04.00][00:14.00]Chorus repeating twice
[00:08.00]Verse between the chorus
    `;
    const result = parseLrc(lrc);
    expect(result.lines).toHaveLength(3);

    // Should be sorted chronologically: 4.0s, 8.0s, 14.0s
    expect(result.lines[0]?.time).toBe(4.0);
    expect(result.lines[0]?.text).toBe("Chorus repeating twice");
    expect(result.lines[1]?.time).toBe(8.0);
    expect(result.lines[1]?.text).toBe("Verse between the chorus");
    expect(result.lines[2]?.time).toBe(14.0);
    expect(result.lines[2]?.text).toBe("Chorus repeating twice");
  });

  it("parses and applies [offset:ms] adjustments", () => {
    const lrc = `
[offset:500]
[00:10.00]Line with +500ms offset
    `;
    const result = parseLrc(lrc);
    expect(result.offsetMs).toBe(500);
    expect(result.lines[0]?.time).toBeCloseTo(10.5, 2);
  });

  it("handles negative [offset:ms] adjustments without going below zero", () => {
    const lrc = `
[offset:-1500]
[00:01.00]Line pushed below zero
[00:05.00]Line with negative offset
    `;
    const result = parseLrc(lrc);
    expect(result.offsetMs).toBe(-1500);
    expect(result.lines[0]?.time).toBe(0); // Clamped at 0
    expect(result.lines[1]?.time).toBeCloseTo(3.5, 2);
  });

  it("ignores metadata tags like [ar:...], [ti:...], [al:...], [by:...]", () => {
    const lrc = `
[ti:Cyberpunk Nights]
[ar:Neuromancer]
[al:Sprawl Tracks]
[by:Orphetune]
[length:03:30]
[00:05.00]Actual lyric line
    `;
    const result = parseLrc(lrc);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.text).toBe("Actual lyric line");
  });

  it("returns empty lines array on empty or invalid input", () => {
    expect(parseLrc("").lines).toEqual([]);
    expect(parseLrc("   \n  \n").lines).toEqual([]);
  });
});

describe("findActiveLyricIndex", () => {
  const lines = [
    { id: "1", time: 5, text: "Line 1" },
    { id: "2", time: 10, text: "Line 2" },
    { id: "3", time: 20, text: "Line 3" },
    { id: "4", time: 30, text: "Line 4" },
  ];

  it("returns -1 before the first lyric time", () => {
    expect(findActiveLyricIndex(lines, 2)).toBe(-1);
    expect(findActiveLyricIndex(lines, 4.99)).toBe(-1);
  });

  it("returns the exact match index", () => {
    expect(findActiveLyricIndex(lines, 5)).toBe(0);
    expect(findActiveLyricIndex(lines, 10)).toBe(1);
    expect(findActiveLyricIndex(lines, 20)).toBe(2);
    expect(findActiveLyricIndex(lines, 30)).toBe(3);
  });

  it("returns the active line between timestamps", () => {
    expect(findActiveLyricIndex(lines, 7.5)).toBe(0);
    expect(findActiveLyricIndex(lines, 15)).toBe(1);
    expect(findActiveLyricIndex(lines, 25)).toBe(2);
  });

  it("returns the last line after the final timestamp", () => {
    expect(findActiveLyricIndex(lines, 100)).toBe(3);
  });

  it("handles empty lines array gracefully", () => {
    expect(findActiveLyricIndex([], 10)).toBe(-1);
  });
});
