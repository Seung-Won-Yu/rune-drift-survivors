# Asset pipeline and sources

## Runtime rule

Only browser-ready assets under `public/models/` ship with the game. Raw downloads, editable source files, and conversion archives stay in ignored local folders under `assets/`.

The active runtime manifest is [`src/config/assets.js`](../src/config/assets.js). When a model is added or removed, update that manifest and its preload group in the same change.

## Active runtime models

### Actors and weapons

- `player-wizard.glb`
- `enemy-demon.glb`
- `enemy-bat-source.glb`
- `enemy-cyclops.glb`
- `boss-cthulhu.glb`
- `projectile-orb.glb`
- `projectile-storm.glb`
- `orbit-blade.glb`

### Kenney Nature Kit

- `nature-kit/tree_pineTallA.glb`
- `nature-kit/tree_pineRoundC.glb`
- `nature-kit/tree_default.glb`
- `nature-kit/rock_largeA.glb`
- `nature-kit/rock_tallE.glb`
- `nature-kit/plant_bushLarge.glb`
- `nature-kit/grass_leafsLarge.glb`

### Quaternius forest accents

- `quaternius/birch-trees.glb`
- `quaternius/pine-trees.glb`
- `quaternius/rocks.glb`
- `quaternius/bushes.glb`

## Applied sources

- [Quaternius RPG Characters](https://quaternius.com/packs/rpgcharacters.html), CC0: player and weapon bases.
- [Quaternius Cute Animated Monsters](https://quaternius.com/packs/cutemonsters.html), CC0: enemy and boss bases.
- [Kenney Nature Kit](https://kenney.nl/assets/nature-kit), CC0: trees, rocks, bushes, and grass.
- [Quaternius Ultimate Stylized Nature Pack](https://poly.pizza/bundle/Ultimate-Stylized-Nature-Pack-zyIyYd9yGr), CC0: imported forest accents.

The root [`ASSET_CREDITS.md`](../ASSET_CREDITS.md) keeps the attribution and source links that should remain visible in the repository.

## Local source folders

These paths are intentionally ignored by git:

```txt
assets/source/
assets/archive/
assets/blender/*.blend
```

Use `assets/source/` for raw downloads, `assets/archive/` for superseded or conversion inputs, and `assets/blender/` for editable Blender files. Do not place raw source packs under `public/`.

## Conversion command

The tracked converter rebuilds the active character and combat models from archived glTF inputs:

```bash
npm run assets:gltf-to-glb
```

Review the generated files visually before committing them. Runtime model names must continue to match `src/config/assets.js`.
