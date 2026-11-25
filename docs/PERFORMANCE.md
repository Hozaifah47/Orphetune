# Local library measurements

Ubuntu, Intel Core i5-1135G7, release executable, temporary application profile and library. The initial library included a tagged FLAC with a Unicode filename and a folder cover, generated PCM WAV files, an invalid MP3 and an external symlink. Later additions were hard links to the same short WAV in directories of 500 paths. These are warm local filesystem measurements with inexpensive metadata. Compressed audio with varied embedded artwork or a cold external disk will have different costs.

| Previously indexed | Total valid tracks | Seconds |
|---:|---:|---:|
| 0 | 100 | 1.04 |
| 100 | 1,000 | 0.24 |
| 1,000 | 10,000 | 1.36 |
| 10,000 | 50,000 | 5.36 |

The table reports the repeat run on a fresh profile. The first interval includes native startup. Later intervals begin before activating Rescan library and end after SQLite reaches the expected count and the rescan control is enabled. Polling resolution was about 100 ms. Fixture creation is excluded.

With 50,000 indexed paths, changing a five-byte FLAC title 100 ms after its original timestamp produced a visible database update in 0.42 seconds from rescan activation. SQLite retained the track ID and playlist membership. After restart there were 50,000 rows and 50,000 distinct paths. The tagged file had cached artwork. Neither the external symlink nor the corrupt MP3 added a row. Opening the large album exposed 72 track-related buttons in the native accessibility tree. Multiple buttons belong to each visible row.
