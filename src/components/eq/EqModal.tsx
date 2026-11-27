import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EqPresets } from "./EqPresets";
import { frequencies } from "@/services/equalizer";
import { audioEngine } from "@/services/audioEngine";
import { X, RotateCcw } from "lucide-react";
import { usePlayerStore } from "@/stores/playerStore";

interface EqBandProps {
  label: string;
  frequency: string;
  value: number;
  onChange: (val: number) => void;
}

function EqBand({ label, frequency, value, onChange }: EqBandProps) {
  // -12 to +12 dB
  const formattedVal = value > 0 ? `+${value.toFixed(1)} dB` : `${value.toFixed(1)} dB`;
  const percent = ((value + 12) / 24) * 100;

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="font-mono text-xs text-bright-red">{formattedVal}</span>

      {/* Vertical Slider Track Container */}
      <div className="relative flex h-48 w-12 items-center justify-center">
        {/* Zero line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-non-text/40 pointer-events-none" />

        {/* Vertical input range */}
        <input
          type="range"
          min={-12}
          max={12}
          step={0.5}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label={`${label} equalizer band`}
          aria-valuemin={-12}
          aria-valuemax={12}
          aria-valuenow={value}
          aria-valuetext={formattedVal}
          className="eq-slider h-44 w-6 appearance-none bg-transparent cursor-pointer"
          style={
            {
              writingMode: "vertical-lr",
              direction: "rtl",
            } as React.CSSProperties
          }
        />

        {/* Visual indicator bar */}
        <div className="absolute inset-y-2 w-1 bg-non-text/20 pointer-events-none">
          <div
            className="absolute bottom-0 left-0 right-0 bg-crimson pointer-events-none"
            style={{ height: `${String(percent)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col items-center text-center">
        <span className="font-sans text-xs font-semibold text-white">{label}</span>
        <span className="font-mono text-[10px] text-muted">{frequency}</span>
      </div>
    </div>
  );
}

export function EqModal() {
  const reduceMotion = useReducedMotion();
  const isEqOpen = usePlayerStore((s) => s.isEqOpen);
  const setIsEqOpen = usePlayerStore((s) => s.setIsEqOpen);
  const eq = usePlayerStore((s) => s.eq);
  const applyEq = usePlayerStore(s => s.applyEq);
  const resetEq = usePlayerStore((s) => s.resetEq);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Esc key and focus trap
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isEqOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setIsEqOpen(false);
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;

        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    },
    [isEqOpen, setIsEqOpen],
  );

  useEffect(() => {
    if (isEqOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      window.addEventListener("keydown", handleKeyDown);

      // Focus first element in modal
      modalRef.current?.querySelector<HTMLElement>("button, input")?.focus();
    } else {
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement.current?.focus();
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEqOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isEqOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="eq-title"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            className="hud-corners hud-corners-active relative w-full max-h-full overflow-y-auto max-w-3xl bg-bg-dark border border-non-text/30 p-6 shadow-none"
          >
            <div className="hud-corners-bottom" aria-hidden="true" />

            {/* Header */}
            <div className="mb-6 flex items-center justify-between border-b border-non-text/20 pb-3">
              <div>
                <h3 id="eq-title" className="font-sans text-base font-semibold text-white">
                  Equalizer
                </h3>
                <p className="font-sans text-xs text-muted">Adjust each band from −12 to +12 dB</p>
              </div>
              <button
                onClick={() => setIsEqOpen(false)}
                aria-label="Close equalizer"
                className="text-muted transition-fast hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label><input type="checkbox" checked={eq.enabled} onChange={e => applyEq({enabled:e.target.checked})}/> Enable EQ</label>
              <label><input type="checkbox" checked={eq.advanced} onChange={e => applyEq({advanced:e.target.checked})}/> Ten-band mode</label>
              <label><input type="checkbox" checked={eq.headroom} onChange={e => applyEq({headroom:e.target.checked})}/> Automatic headroom</label>
            </div>
            <EqPresets eq={eq} apply={applyEq}/>
            <div className={`grid my-4 ${eq.advanced ? "grid-cols-10" : "grid-cols-3"}`}>
              {eq.advanced ? frequencies.map((hz,i) => <EqBand key={hz} label={hz >= 1000 ? hz/1000+"k" : String(hz)} frequency="Hz"
                value={eq.bands[i]!} onChange={value => applyEq({bands:eq.bands.map((db,j) => i === j ? value : db)})}/>) :
                (["bass","mid","treble"] as const).map((band,i) => <EqBand key={band} label={["Bass","Mid","Treble"][i]!}
                  frequency={["120 Hz","1 kHz","8 kHz"][i]!} value={eq[band]} onChange={v => applyEq({[band]:v})}/>)}
            </div>
            <div className="flex flex-wrap items-center gap-5 text-sm">
              <label>Preamp <input aria-label="Preamp" className="align-middle accent-crimson" type="range" min="-12" max="12" step="0.5"
                value={eq.preamp} onChange={e=>applyEq({preamp:Number(e.target.value)})}/> {eq.preamp} dB</label>
              <label>ReplayGain <select className="bg-bg-dark" value={eq.normalization}
                onChange={e=>applyEq({normalization:e.target.value as typeof eq.normalization})}>
                <option value="off">Off</option><option value="track">Track</option><option value="album">Album</option></select></label>
            </div>
            <PeakMeter/>
            {/* Footer with Reset Button */}
            <div className="mt-6 flex items-center justify-between border-t border-non-text/20 pt-4">
              <button
                onClick={resetEq}
                className="flex items-center gap-2 border border-non-text/40 bg-transparent px-3 py-1.5 font-sans text-xs text-white transition-fast hover:border-crimson hover:bg-crimson/10"
              >
                <RotateCcw size={14} />
                <span>Reset to Flat</span>
              </button>

              <button
                onClick={() => setIsEqOpen(false)}
                className="bg-crimson px-4 py-1.5 font-sans text-xs text-white transition-fast hover:bg-bright-red hover:text-bg-dark"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function PeakMeter() {
  const meter = useRef<HTMLMeterElement>(null);
  const label = useRef<HTMLOutputElement>(null);
  const normalization = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const peak = audioEngine.outputPeak();
      const db = peak ? 20 * Math.log10(peak) : -Infinity;
      if (normalization.current) normalization.current.textContent = audioEngine.normalizationStatus();
      if (meter.current) meter.current.value = Math.max(-60, db);
      if (label.current) label.current.value = db < -60 ? "Below −60 dBFS" : db.toFixed(1) + " dBFS" + (peak >= 1 ? " · At full scale" : "");
    }, 100);
    return () => window.clearInterval(timer);
  }, []);
  return <div className="mt-3 flex items-center gap-3 text-xs text-muted">
    Output peak <meter ref={meter} aria-label="Output peak" min={-60} max={0} defaultValue={-60}/>
    <output ref={label} aria-live="off"/><span ref={normalization}/>
  </div>;
}
