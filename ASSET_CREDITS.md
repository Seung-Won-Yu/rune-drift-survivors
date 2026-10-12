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

## Project-authored character atlases

- `public/sprites/rune-warden-animation-atlas-v2.webp`
- `public/sprites/riftborn-common-animation-atlas-v1.webp`
- `public/sprites/riftborn-threat-animation-atlas-v1.webp`

These four-direction character atlases were generated specifically for this repository with OpenAI's built-in ImageGen tool, then integrated and animated through project-authored Three.js code. They do not reuse third-party character models.

The Rune Warden atlas contains idle, walk, cast, and hurt poses. The Riftborn atlases contain two movement contacts for runner, golem, brute, bulwark, charger, summoner, and the Rift Warden boss.

All three ship as lossless WebP. Their decoded RGB pixels match the generated PNG sources exactly while reducing the combined transfer size by about 30%.

## Project-authored interface atlas

- `public/art/ui/rune-upgrade-atlas-v1.png`

The transparent 3 × 3 rune ability atlas was generated specifically for this repository with OpenAI's built-in ImageGen tool. It supplies the upgrade-card illustrations for weapon, movement, survival, collection, and general arcane choices and does not reuse third-party UI art.

## Runtime treatment

Rune Drift Survivors ships no Blender, glTF, or GLB assets. Terrain, foliage, ruins, landmarks, projectiles, orbit blades, telegraphs, lighting, and effects are assembled from project-authored Three.js geometry, shaders, and runtime-generated textures.
