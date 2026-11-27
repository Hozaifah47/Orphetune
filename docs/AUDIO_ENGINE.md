# Playback and verification

Orphetune streams each track into an HTML audio element connected to one Web Audio graph. Bass uses a 120 Hz low shelf, mid a 1 kHz peaking filter with Q 1, and treble an 8 kHz high shelf. The basic and ten-band filter banks share a preamp and master volume. Only the selected bank applies gain. Volume and EQ changes use a 12 ms time constant. The graph relies on the platform decoder and output device.

The store tracks the selected queue entry and the entry actually loaded into the element. A resume during an unfinished track change loads the selection again. Late events and obsolete requests are ignored. Seek positions are bounded by the current track duration. Tests cover duplicate queue entries, shuffle restoration, unreadable tracks under repeat-all, interrupted loads and seek bounds.

On Ubuntu the release played generated WAV (440 Hz), MP3 (1 kHz) and FLAC (3 kHz) through native WebKit. A disposable library, nested display and private PipeWire sink isolated the test. Monitor samples confirmed silence during pause and at zero volume, audio after resume, and the expected tones across shuffle restoration and repeat transitions. A keyboard seek advanced at least ten seconds. A +12 dB mid adjustment increased the 1 kHz RMS from 0.06716 to 0.26737 at fixed volume. These measurements cover the software output path. Physical speaker fidelity, OS media key integration and other operating systems require separate checks.

## Advanced audio checkpoint

Ten-band mode uses octave-spaced peaking filters from 31 Hz to 16 kHz with Q equal to the square root of two. Automatic headroom estimates the combined filter response across 256 logarithmically spaced frequencies and reduces preamp gain when needed. ReplayGain reads track or album tags from the authorized file. Album mode falls back to track gain. Untagged files use unity normalization. The output meter samples both channels after master volume. The headroom estimate and sample peak meter do not certify intersample true peaks.

In native Ubuntu playback, a 1 kHz fixture measured 0.09725 RMS at flat settings. A +6 dB adjustment measured 0.19410 with headroom disabled and 0.09728 with it enabled. A −6 dB track gain tag measured 0.04876 after resetting the EQ. The gain setting survived restart.

The single audio element changes sources after the ended event. A 500 Hz to 1.5 kHz FLAC transition had 20 silent 10 ms bins on the isolated Ubuntu monitor. Sample-contiguous playback requires a different scheduling strategy. Crossfade needs two concurrently decoded tracks, overlapping gain envelopes and lifetime management for both local playback URLs. Neither transition mode is offered by this build.
