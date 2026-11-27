import { frequencies, playbackGain, readEq, type EqSettings, type GainTags } from "./equalizer";
export type { EqSettings } from "./equalizer";

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private audio: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private preamp: GainNode | null = null;
  private probe: BiquadFilterNode | null = null;
  private meters: AnalyserNode[] = [];
  private meterBuffer = new Float32Array(2048);
  private tags: GainTags | null = null;
  private boostDb = 0;
  private gainNode: GainNode | null = null;
  private initialized = false;
  private volume = 0.8;
  private eq = readEq(null);
  private sourceRevision = 0;

  private onErrorCallback: ((err: Error | MediaError | null) => void) | null = null;
  private onEndedCallback: (() => void) | null = null;

  public init(): void {
    if (this.initialized) return;

    // Create HTMLAudioElement
    this.audio = new Audio();
    this.audio.crossOrigin = "anonymous";
    this.audio.preload = "auto";

    // Create AudioContext (lazy gesture-based or immediate, will resume on gesture)
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioContextClass();

    // Source node
    this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);

    this.preamp = this.audioCtx.createGain();
    this.probe = this.audioCtx.createBiquadFilter();
    let previous: AudioNode = this.sourceNode.connect(this.preamp);
    for (const [i, hz] of [120, 1000, 8000, ...frequencies].entries()) {
      const node = this.audioCtx.createBiquadFilter();
      node.type = i === 0 ? "lowshelf" : i === 2 ? "highshelf" : "peaking";
      node.frequency.value = Math.min(hz, this.audioCtx.sampleRate * 0.49);
      node.Q.value = i < 3 ? 1 : Math.SQRT2;
      this.filters.push(node);
      previous = previous.connect(node);
    }
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.value = this.volume;
    previous.connect(this.gainNode).connect(this.audioCtx.destination);
    const splitter = this.audioCtx.createChannelSplitter(2);
    this.gainNode.connect(splitter);
    this.meters = [0, 1].map(channel => {
      const analyser = this.audioCtx!.createAnalyser();
      analyser.fftSize = this.meterBuffer.length;
      splitter.connect(analyser, channel);
      return analyser;
    });
    this.setAllEq(this.eq);

    // Wire native audio element events
    this.audio.addEventListener("ended", () => {
      this.onEndedCallback?.();
    });

    this.audio.addEventListener("error", () => {
      const err = this.audio?.error ?? null;
      this.onErrorCallback?.(err);
    });

    this.initialized = true;
  }

  public async ensureContext(): Promise<void> {
    this.init();
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }
  }

  public setCallbacks(callbacks: {
    onError?: (err: Error | MediaError | null) => void;
    onEnded?: () => void;
  }): void {
    if (callbacks.onError) this.onErrorCallback = callbacks.onError;
    if (callbacks.onEnded) this.onEndedCallback = callbacks.onEnded;
  }

  public getAudioElement(): HTMLAudioElement | null {
    return this.audio;
  }

  public async loadAndPlay(src: string, start = 0): Promise<void> {
    const revision = ++this.sourceRevision;
    await this.ensureContext();
    if (!this.audio || revision !== this.sourceRevision) return;
    this.audio.src = src;
    if (start > 0) this.audio.currentTime = start;
    await this.audio.play();
  }

  public async play(): Promise<void> {
    const revision = this.sourceRevision;
    await this.ensureContext();
    if (this.audio && this.audio.src && revision === this.sourceRevision) {
      await this.audio.play();
    }
  }

  public pause(): void {
    ++this.sourceRevision;
    if (this.audio) {
      this.audio.pause();
    }
  }

  public seek(seconds: number): void {
    if (this.audio && isFinite(seconds)) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration || 0));
    }
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.volume = clamped;
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setTargetAtTime(clamped, this.audioCtx.currentTime, 0.012);
    }
  }

  public setAllEq(eq: EqSettings): void {
    this.eq = eq;
    if (!this.audioCtx || !this.probe) return;
    const hz = Float32Array.from({length: 256}, (_, i) => 10 * (this.audioCtx!.sampleRate / 20) ** (i / 256));
    const response = new Float32Array(hz.length);
    const phase = new Float32Array(hz.length);
    const combined = new Float32Array(hz.length).fill(1);
    const basic = [eq.bass, eq.mid, eq.treble];
    this.filters.forEach((node, i) => {
      const db = eq.enabled && (i >= 3) === eq.advanced ? (i < 3 ? basic[i]! : eq.bands[i - 3]!) : 0;
      node.gain.setTargetAtTime(db, this.audioCtx!.currentTime, 0.012);
      if (db === 0) return;
      const probe = this.probe!;
      probe.type = node.type;
      probe.frequency.value = node.frequency.value;
      probe.Q.value = node.Q.value;
      probe.gain.value = db;
      probe.getFrequencyResponse(hz, response, phase);
      for (let j = 0; j < combined.length; j++) combined[j] = combined[j]! * response[j]!;
    });
    this.boostDb = Math.max(0, 20 * Math.log10(Math.max(...combined)));
    this.applyPreamp();
  }

  private applyPreamp() {
    if (this.preamp && this.audioCtx) {
      this.preamp.gain.setTargetAtTime(playbackGain(this.eq, this.tags, this.boostDb), this.audioCtx.currentTime, 0.012);
    }
  }

  public setGainTags(tags: GainTags | null) {
    this.tags = tags;
    this.applyPreamp();
  }

  public normalizationStatus(): string {
    if (this.eq.normalization === "off") return "";
    const album = this.eq.normalization === "album" && this.tags?.albumGain != null;
    const db = album ? this.tags?.albumGain : this.tags?.trackGain;
    return db == null ? "No ReplayGain tag" : (album ? "Album" : "Track") + " gain " + db.toFixed(1) + " dB";
  }

  public outputPeak(): number {
    let peak = 0;
    for (const meter of this.meters) {
      meter.getFloatTimeDomainData(this.meterBuffer);
      for (const sample of this.meterBuffer) peak = Math.max(peak, Math.abs(sample));
    }
    return peak;
  }

  public getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }

  public getDuration(): number {
    return this.audio?.duration || 0;
  }
}

export const audioEngine = new AudioEngine();
