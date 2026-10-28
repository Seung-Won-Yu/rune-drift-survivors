# Ash & Amber interface fonts

The active interface uses **Ash Interface**, a self-hosted variable subset of
Noto Sans KR, with a 100–900 weight axis. The outpost title, character names,
controls and combat UI share this plain Korean-capable family. The delivered
WOFF2 is 68,476 bytes and covers every Hangul syllable in the game UI sources.
No font CDN or runtime external network dependency is used.

- Upstream: [Google Fonts / Noto Sans KR](https://github.com/google/fonts/tree/main/ofl/notosanskr).
- Source: `NotoSansKR[wght].ttf`, 10,414,588 bytes, Git blob `b386890ba945e1f39448a6b59f20c5d194f58808`.
- License: [SIL Open Font License 1.1](./OFL-NotoSansKR.txt), retained with the subset.
- Delivery: `ash-interface-variable.woff2`; CSS family alias `Ash Interface`.

The earlier `ash-journal-700.woff2` remains available for historical journal UI.
It is a weight-700 subset of [Noto Serif KR](https://github.com/google/fonts/tree/main/ofl/notoserifkr),
source 23,795,420 bytes, blob `cc85b383766708c9291f72baeeab05760774f492`, with its
[OFL license](./OFL-NotoSerifKR.txt). The active interface does not request it.

Asset authoring requires Python `fonttools[woff]`; normal builds/play do not.
After changing Korean UI copy, rebuild from the licensed upstream source:

```sh
python3 scripts/build-survivor-font.py '/path/to/NotoSansKR[wght].ttf' --variable --output public/fonts/ash-interface-variable.woff2
```

The script reads the survivor JavaScript and HTML, preserves deterministic
timestamps and checks complete source Hangul coverage. Its original no-option
command still builds the static journal face at weight 700.
