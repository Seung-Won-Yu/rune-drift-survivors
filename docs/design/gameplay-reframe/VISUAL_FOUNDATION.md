# Visual Foundation — Material Before More Models

## Decision

The battlefield will not depend on adding more Blender assets to become attractive. The visual order is:

1. coherent terrain surface;
2. directional lighting and contact shadows;
3. restrained color and material response;
4. readable landmarks and silhouettes;
5. selective authored models only where they carry identity.

Blender remains useful for the player, signature enemies, the four seals, and a small number of hero landmarks. It is not the default tool for ground fill, broad biome color, paths, or repeated surface detail.

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

- Imported GLB textures and PBR maps are preserved in balanced and high quality.
- Art-direction colors tint source materials instead of replacing them with unlit `MeshBasicMaterial`.
- Repeated field props use lit, rough materials so the same key light binds procedural and imported geometry together.
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
- Repetition should be broken through scale, rotation, palette tint, and clustered placement before adding more asset types.

## Delivered in this slice

- Runtime-generated terrain albedo, normal, and roughness maps for balanced/high.
- Smoother balanced/high terrain geometry and corrected texture color handling.
- PBR-preserving tinting for imported environment models.
- PBR materials for balanced trees, bushes, rocks, grass, and ruin slabs.
- Balanced anti-aliasing, dynamic contact shadows, and rebalanced field lighting.
- Removal of broad intersecting decals that caused large broken triangles on the ground.

## Next art slices

1. Replace only the four seal landmarks with one coherent authored kit.
2. Build a small reusable material library for moss stone, bark, leaf, soil, and rune metal.
3. Add clustered grass/pebble detail with distance-based density rather than unique scene models.
4. Establish one fog and color-grade profile per quality tier.
5. Revisit character/enemy models after the world palette and scale guide are locked.

## Acceptance checks

- At the standard balanced camera, the ground reads as a continuous surface without black crushing or decal intersection artifacts.
- Player and nearby enemies remain readable in motion and in shadow.
- Imported props react to the same lighting as procedural props.
- Low quality remains functional without dynamic shadows or procedural material maps.
- The stress scene stays within its existing runtime budget assertions.
