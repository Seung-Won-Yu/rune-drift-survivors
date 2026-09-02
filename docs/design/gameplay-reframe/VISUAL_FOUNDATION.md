# Visual Foundation — Model-Free Material System

## Decision

The battlefield does not depend on Blender or imported 3D models. The visual order is:

1. coherent terrain surface;
2. directional lighting and contact shadows;
3. restrained color and material response;
4. readable landmarks and silhouettes;
5. authored 2.5D sprites only where a character needs identity.

Characters use project-authored 2.5D atlases. Terrain, landmarks, weapons, foliage, and repeated surface detail use code-built geometry, shaders, and runtime textures. Blender, glTF, and GLB are outside the active production pipeline.

## Target look

- A dark forest ruin that is moody without turning the playable floor black.
- Moss, soil, worn stone, and rune light share one muted palette.
- The player, enemies, pickups, and the active seal stay brighter and cleaner than the field.
- Large forms describe navigation; fine material detail prevents empty surfaces from feeling unfinished.
- Effects use mint, cyan, gold, and danger red as signals rather than ambient decoration.

## Foundation layers

### 1. Terrain

- Macro color comes from world position, height, paths, rings, and biome zones.
- Micro color, normal, and roughness are generated as deterministic seamless PBR textures.
- Balanced quality uses enough terrain subdivisions to avoid visible low-poly color triangles.
- Large flat decals are avoided on sculpted ground because they intersect the surface and produce broken polygon patches.

### 2. Materials

- Runtime terrain textures and PBR maps are generated deterministically for balanced and high quality.
- Art-direction colors come from shared tokens and material families rather than source-model overrides.
- Repeated field props use lit, rough materials so one key light binds every code-built surface together.
- Emissive materials are reserved for runes, pickups, telegraphs, and combat feedback.

### 3. Lighting

- One warm directional key light establishes form and casts bounded arena shadows.
- A cool fill and hemisphere light retain detail in the dark palette.
- Balanced quality keeps anti-aliasing and a capped 1024 shadow map; low quality disables dynamic shadows.
- Lighting must reveal form without reducing enemy or HUD contrast.

### 4. Composition

- The central combat area stays open and low-frequency.
- Shrines, perimeter trees, and ruin clusters create navigation anchors outside the combat core.
- Broad decorative patches cannot compete with the Rune Circuit route.
- Low, balanced, and high share one authoritative field composition; quality tiers cannot reintroduce a separate decorative battlefield.
- Repetition should be broken through scale, rotation, palette tint, and clustered placement before adding more asset types.

## Delivered in this slice

- Runtime-generated terrain albedo, normal, and roughness maps for balanced/high.
- Smoother balanced/high terrain geometry and corrected texture color handling.
- Model-free PBR materials for trees, bushes, rocks, grass, and ruin slabs.
- Balanced anti-aliasing, dynamic contact shadows, and rebalanced field lighting.
- Removal of broad intersecting decals that caused large broken triangles on the ground.
- Removal of the legacy high-only backdrop stack that reintroduced intersecting decals and duplicated field landmarks.

## Next art slices

1. Replace only the four seal landmarks with one coherent authored kit.
2. Build a small reusable material library for moss stone, bark, leaf, soil, and rune metal.
3. Add clustered grass/pebble detail with distance-based density rather than unique scene models.
4. Establish one fog and color-grade profile per quality tier.
5. Tune character atlas scale and animation cadence after the world palette is locked.

## Acceptance checks

- At the standard balanced camera, the ground reads as a continuous surface without black crushing or decal intersection artifacts.
- Player and nearby enemies remain readable in motion and in shadow.
- Code-built props react consistently to the shared lighting system.
- Low quality remains functional without dynamic shadows or procedural material maps.
- The stress scene stays within its existing runtime budget assertions.
