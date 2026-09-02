# Asset pipeline and sources

## Runtime rule

The shipped game is model-free. `public/` contains only the project-authored character atlases under `public/sprites/`; there is no `public/models/` directory, model preload group, GLB converter, or runtime model loader.

The active manifest is [`src/config/assets.js`](../src/config/assets.js). It must remain limited to assets that are requested by the current build.

## Project-authored sprites

- `sprites/rune-warden-animation-atlas-v2.webp`: 4 × 6 atlas containing back, right, front, and left views across idle A/B, walk A/B, cast, and hurt poses.
- `sprites/riftborn-common-animation-atlas-v1.webp`: 4 × 6 atlas containing runner, golem, and brute walk A/B rows across the same four directions.
- `sprites/riftborn-threat-animation-atlas-v1.webp`: 4 × 8 atlas containing bulwark, charger, summoner, and boss movement A/B rows across the same four directions.

The atlases were generated with OpenAI's built-in ImageGen tool from the project's dark-rune, stone, cyan-corruption, and worn-gold art direction. `src/systems/playerSprite.js` and `src/systems/enemySprite.js` own deterministic frame selection; `src/world/PlayerAvatar.jsx` and `src/world/EnemyInstances.jsx` own rendering.

The current lossless WebP sources are RGB with a pale neutral checker. Their decoded pixels are identical to the generated PNG sources while the combined deployable size is about 30% smaller. The shared `src/world/neutralKeyShader.js` material fragment converts that neutral range into a clamped alpha edge and darkens partially keyed edge pixels so a white halo cannot survive filtering. All character atlases disable mipmaps and use linear filtering to prevent pale source pixels bleeding into minified silhouettes. A future true-alpha export can remove this compatibility path without changing frame selection.

## Code-built visuals

The following systems intentionally use Three.js geometry, materials, shaders, and runtime-generated textures instead of imported models:

- terrain, paths, foliage silhouettes, rocks, ruins, camps, and perimeter landmarks;
- Rune Circuit gates, rank stones, route markers, and relic structures;
- orb and storm projectiles, orbit blades, weapon strikes, and telegraphs;
- contact shadows, atmosphere, lighting, and combat feedback.

Render quality changes the density and presentation cost of these systems, never the gameplay simulation and never the asset format.

## Local source workspace

`assets/source/` remains ignored and may be used for non-runtime visual references. Blender working files, archived GLB packages, and conversion inputs were removed when the model-free runtime became authoritative.

The root [`ASSET_CREDITS.md`](../ASSET_CREDITS.md) records the shipped asset provenance.
