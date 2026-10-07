# Ash & Amber display font

`ash-journal-700.woff2` is a self-hosted, weight-700 subset of **Noto Serif KR**. It gives Korean titles the field-journal character used throughout the game. Body copy retains the existing sans-serif stack. No font CDN or runtime network dependency is used.

- Upstream: [Google Fonts / Noto Serif KR](https://github.com/google/fonts/tree/main/ofl/notoserifkr).
- Source: `NotoSerifKR[wght].ttf`, 23,795,420 bytes, Git blob `cc85b383766708c9291f72baeeab05760774f492`.
- License: [SIL Open Font License 1.1](./OFL-NotoSerifKR.txt), retained with the redistributed subset.
- Delivery: a static WOFF2 subset containing UI source characters, initially 76,888 bytes. CSS uses the family alias `Ash Journal`.
- Authoring requires Python `fonttools[woff]`; ordinary game installation, builds and play do not.

After changing Korean UI copy, download the upstream source and run:

```sh
python3 scripts/build-survivor-font.py '/path/to/NotoSerifKR[wght].ttf'
```

The script reads the current survivor JavaScript and HTML, fixes the font weight, preserves deterministic timestamps, and checks that every source Hangul syllable is included. Browser QA checks the actual font face reaches its loaded state. Keep the license with the font when redistributing it.
