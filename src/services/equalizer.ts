export const frequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;
export interface EqSettings {
  bass: number;
  mid: number;
  treble: number;
  bands: number[];
  advanced: boolean;
  enabled: boolean;
  headroom: boolean;
  preamp: number;
  normalization: "off" | "track" | "album";
}
export function gain(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(-12, Math.min(12, Math.round(value * 2) / 2)) : 0;
}

export function readEq(value: unknown): EqSettings {
  const data = (value && typeof value === "object" ? value : {}) as Partial<EqSettings>;
  const legacy = "bass" in data && !("headroom" in data);
  return {
    bass: gain(data.bass), mid: gain(data.mid), treble: gain(data.treble),
    bands: frequencies.map((_, i) => gain(data.bands?.[i])),
    preamp: gain(data.preamp), advanced: data.advanced === true,
    enabled: data.enabled !== false, headroom: typeof data.headroom === "boolean" ? data.headroom : !legacy,
    normalization: data.normalization === "track" || data.normalization === "album" ? data.normalization : "off",
  };
}

export interface GainTags {
  trackGain: number | null;
  albumGain: number | null;
  trackPeak: number | null;
  albumPeak: number | null;
}

export function playbackGain(eq: EqSettings, tags: GainTags | null, boostDb: number): number {
  const album = eq.normalization === "album" && tags?.albumGain != null;
  const correction = eq.normalization === "off" ? 0 : (album ? tags?.albumGain : tags?.trackGain) ?? 0;
  const peak = eq.normalization === "off" ? null : album ? tags?.albumPeak : tags?.trackPeak;
  const wanted = correction + (eq.enabled ? eq.preamp : 0);
  const ceiling = -boostDb - 20 * Math.log10(peak && peak > 0 ? peak : 1);
  return 10 ** ((eq.headroom ? Math.min(wanted, ceiling) : wanted) / 20);
}
