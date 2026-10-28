# Asset credits

## Ash & Amber combat paintings

- `public/art/survivor/hero-ash-motion-v1.webp`
- `public/art/survivor/hero-ember-motion-v1.webp`
- `public/art/survivor/hero-grove-motion-v1.webp`
- `public/art/survivor/hound-motion-v1.webp`
- `public/art/survivor/giant-motion-v1.webp`
- `public/art/survivor/ash-sovereign-motion-v1.webp`

These 24-pose sheets were generated for this repository with the built-in OpenAI ImageGen tool using the existing cast as references. Transparent PNG originals were converted to WebP with alpha and source dimensions preserved. Measured extraction rectangles, animation clocks, outlines, root projectiles and material-hit marks are project-authored Canvas 2D code.

The [initial motion prompts](./public/art/survivor/MOTION-PROMPTS.md) and [companion/sovereign prompts](./public/art/survivor/COMPANION-BOSS-PROMPTS.md) record the submitted instructions and saved assets. The latter uses `cwebp -q 92 -alpha_q 100`; its RGB encoding is lossy, its alpha is preserved, and no third-party character art is reused.

## Environment, portraits and interface

The current companion and enemy sheets, forest paintings and lobby portraits are documented in the [survivor art provenance](./public/art/survivor/README.md). `src/survivor/collection-art.js` contains project-authored SVG collection illustrations; Canvas/CSS supplies terrain details, shadows, projectiles, warning shapes and interface feedback.

The active lobby uses `forest-outpost-v1.webp`, generated with the built-in OpenAI ImageGen tool and encoded as a same-size WebP. The [complete prompt and provenance](./public/art/survivor/OUTPOST-PROMPT.md) accompany the asset. It contains no baked-in interface or characters.

## Font

The active self-hosted `Ash Interface` family is a variable 100–900 subset of Noto Sans KR. Its [source and build notes](./public/fonts/README.md) and [SIL Open Font License 1.1](./public/fonts/OFL-NotoSansKR.txt) remain with the redistributed font. The earlier `Ash Journal` subset of Noto Serif KR and its [license](./public/fonts/OFL-NotoSerifKR.txt) are retained for historical use.

The retired 3D prototype's character and interface atlases are no longer distributed. Their provenance remains in Git history.
