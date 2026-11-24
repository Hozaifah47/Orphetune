/**
 * Singleton Web Audio Engine for Orphetune
 *
 * Audio Graph:
 *   HTMLAudioElement (crossOrigin = "anonymous")
 *        │
 *   MediaElementAudioSourceNode
 *        │
 *   BiquadFilterNode: lowshelf (Bass, 120 Hz, -12..+12 dB)
 *        │
 *   BiquadFilterNode: peaking (Mid, 1 kHz, Q 1, -12..+12 dB)
 *        │
 *   BiquadFilterNode: highshelf (Treble, 8 kHz, -12..+12 dB)
 *        │
 *   GainNode (Volume, 0..1)
 *        │
 *   AudioContext.destination
 */

export interface EqSettings {
  bass: number;
  mid: number;
  treble: number;
}

class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private audio: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private bassNode: BiquadFilterNode | null = null;
  private midNode: BiquadFilterNode | null = null;
  private trebleNode: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private initialized = false;

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

    // Bass: Lowshelf 120 Hz
    this.bassNode = this.audioCtx.createBiquadFilter();
    this.bassNode.type = "lowshelf";
    this.bassNode.frequency.value = 120;
    this.bassNode.gain.value = 0;

    // Mid: Peaking 1 kHz, Q 1
    this.midNode = this.audioCtx.createBiquadFilter();
    this.midNode.type = "peaking";
    this.midNode.frequency.value = 1000;
    this.midNode.Q.value = 1;
    this.midNode.gain.value = 0;

    // Treble: Highshelf 8 kHz
    this.trebleNode = this.audioCtx.createBiquadFilter();
    this.trebleNode.type = "highshelf";
    this.trebleNode.frequency.value = 8000;
    this.trebleNode.gain.value = 0;

    // Gain (Volume)
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.value = 1.0;

    // Connect graph
    this.sourceNode
      .connect(this.bassNode)
      .connect(this.midNode)
      .connect(this.trebleNode)
      .connect(this.gainNode)
      .connect(this.audioCtx.destination);

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

  public async loadAndPlay(src: string): Promise<void> {
    await this.ensureContext();
    if (!this.audio) return;
    this.audio.src = src;
    await this.audio.play();
  }

  public async play(): Promise<void> {
    await this.ensureContext();
    if (this.audio && this.audio.src) {
      await this.audio.play();
    }
  }

  public pause(): void {
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
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(clamped, this.audioCtx.currentTime);
    }
  }

  public setEq(band: "bass" | "mid" | "treble", gainDb: number): void {
    const clamped = Math.max(-12, Math.min(12, Math.round(gainDb * 2) / 2));
    const now = this.audioCtx ? this.audioCtx.currentTime : 0;
    switch (band) {
      case "bass":
        if (this.bassNode) this.bassNode.gain.setValueAtTime(clamped, now);
        break;
      case "mid":
        if (this.midNode) this.midNode.gain.setValueAtTime(clamped, now);
        break;
      case "treble":
        if (this.trebleNode) this.trebleNode.gain.setValueAtTime(clamped, now);
        break;
    }
  }

  public setAllEq(eq: EqSettings): void {
    this.setEq("bass", eq.bass);
    this.setEq("mid", eq.mid);
    this.setEq("treble", eq.treble);
  }

  public getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }

  public getDuration(): number {
    return this.audio?.duration || 0;
  }
}

export const audioEngine = new AudioEngine();
