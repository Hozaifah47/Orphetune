import { describe, expect, it } from "vitest";
import { playbackGain, readEq } from "./equalizer";

describe("equalizer settings", () => {
  it("preserves saved three-band gains and their original playback level", () => {
    const eq = readEq({ bass: 6, mid: -2, treble: 1 });
    expect(eq).toMatchObject({ bass: 6, mid: -2, treble: 1, advanced: false, headroom: false });
    expect(playbackGain(eq, null, 6)).toBe(1);
  });
  it("bounds malformed band and preamp values from storage", () => {
    const eq = readEq({bands:[20,NaN,-14], preamp:Infinity});
    expect(eq.bands).toEqual([12,0,-12,0,0,0,0,0,0,0]);
    expect(eq.preamp).toBe(0);
  });
  it("uses album gain with track fallback and accounts for peak headroom", () => {
    const eq = readEq({normalization:"album"});
    const tags = {trackGain:6, trackPeak:0.5, albumGain:-3, albumPeak:0.9};
    expect(playbackGain(eq,tags,0)).toBeCloseTo(10**(-3/20));
    expect(playbackGain(eq,{...tags,albumGain:null},6)).toBeCloseTo(2*10**(-6/20));
    expect(playbackGain(eq,null,6)).toBeCloseTo(10**(-6/20));
  });
});
