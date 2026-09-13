# Bundled typefaces

Both faces ship with the extension so the brand type renders everywhere, not
only on machines that happen to have them installed. Both are licensed under the
SIL Open Font License 1.1, which permits bundling and redistribution and
**requires the license text to travel with the font files**. That is why the two
`OFL-*.txt` files are here, and why they must stay in the packaged zip.

| File | Family | Weights | License |
| --- | --- | --- | --- |
| `plus-jakarta-sans.woff2` | Plus Jakarta Sans | 200-800 variable | `OFL-PlusJakartaSans.txt` |
| `ibm-plex-mono-400.woff2` | IBM Plex Mono | 400 | `OFL-IBMPlexMono.txt` |
| `ibm-plex-mono-500.woff2` | IBM Plex Mono | 500 | `OFL-IBMPlexMono.txt` |

These are the `latin` subsets from Google Fonts, which is why they are ~47KB
in total rather than several hundred. If the tool ever needs to render
non-latin text in its own chrome, the wider subsets have to be added here.

Neither font is modified. Under the OFL that matters: modified copies may not
use the reserved font names.
