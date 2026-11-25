# Playback and verification

Orphetune streams each track into an HTML audio element connected to one Web Audio graph. Bass uses a 120 Hz low shelf, mid a 1 kHz peaking filter with Q 1, and treble an 8 kHz high shelf. The master gain follows the filters. Volume and EQ changes use a 12 ms time constant. The graph relies on the platform decoder and output device.

The store tracks the selected queue entry and the entry actually loaded into the element. A resume during an unfinished track change loads the selection again. Late events and obsolete requests are ignored. Seek positions are bounded by the current track duration. Tests cover duplicate queue entries, shuffle restoration, unreadable tracks under repeat-all, interrupted loads and seek bounds.

On Ubuntu the release played generated WAV (440 Hz), MP3 (1 kHz) and FLAC (3 kHz) through native WebKit. A disposable library, nested display and private PipeWire sink isolated the test. Monitor samples confirmed silence during pause and at zero volume, audio after resume, and the expected tones across shuffle restoration and repeat transitions. A keyboard seek advanced at least ten seconds. A +12 dB mid adjustment increased the 1 kHz RMS from 0.06716 to 0.26737 at fixed volume. These measurements cover the software output path. Physical speaker fidelity, OS media key integration and other operating systems require separate checks.
