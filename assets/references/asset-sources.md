# Asset Source Notes

Use external assets as bases or references, then reshape them into the Rune Drift visual language before shipping.

## Preferred Sources

- Kenney: CC0 game assets, good for dungeon props, UI icons, textures, and map kit pieces.
  - https://kenney.nl/assets
  - License note: Kenney support says game assets are public domain licensed (CC0), commercial use is okay, and attribution is optional.
- Quaternius: strong low-poly character, monster, animation, ruins, and fantasy packs.
  - https://quaternius.com/
  - Check the license included with each downloaded pack before importing.
- Poly Pizza: useful for small low-poly props and silhouette references.
  - https://poly.pizza/
  - Check each model's Creative Commons license at download time.
- OpenGameArt: broad library, but licenses vary heavily.
  - https://opengameart.org/
  - Prefer CC0 assets; document attribution if using CC-BY assets.

## Applied Sources

- Quaternius RPG Character Pack
  - Source: https://quaternius.com/packs/rpgcharacters.html
  - License: CC0 on the pack page.
  - Used for: player base character, dagger orbit blade, arrow-like rune projectile, staff-like storm marker.
  - Raw source: `assets/source/quaternius-rpg-character-pack/`
- Quaternius Cute Animated Monsters Pack
  - Source: https://quaternius.com/packs/cutemonsters.html
  - License: CC0 on the pack page.
  - Used for: golem/demon enemy, bat runner enemy, yeti brute enemy, cthulhu boss enemy, haunted tree arena prop.
  - Raw source: `assets/source/quaternius-cute-monsters/`
- Kenney Modular Dungeon Kit
  - Source: https://kenney.nl/assets/modular-dungeon-kit
  - License: Creative Commons CC0 on the pack page.
  - Used for: dungeon floor tiles, floor detail tiles, raised floor pieces, and half-wall fragments.
  - Raw source: `assets/source/kenney-modular-dungeon-kit/`
- Quaternius Ultimate Modular Ruins Pack
  - Source: https://quaternius.com/packs/ultimatemodularruins.html
  - License: CC0 on the pack page.
  - Used for: large ruin arches, overgrown walls, columns, stairs, statues, modular floor tiles, cracked floor pieces, and trapdoors.
  - Raw source: `assets/source/quaternius-ultimate-modular-ruins-pack/`

## Current Game-Ready GLB Outputs

- `public/models/rune-drifter.glb`
- `public/models/player-wizard.gltf`
- `public/models/enemy-golem.glb`
- `public/models/enemy-demon.gltf`
- `public/models/enemy-runner.glb`
- `public/models/enemy-bat-source.gltf`
- `public/models/enemy-brute.glb`
- `public/models/enemy-cyclops.gltf`
- `public/models/boss-cthulhu.gltf`
- `public/models/arena-tree.glb`
- `public/models/projectile-orb.glb`
- `public/models/projectile-storm.glb`
- `public/models/orbit-blade.glb`
- `public/models/dungeon-floor.glb`
- `public/models/dungeon-floor-detail.glb`
- `public/models/dungeon-floor-raised.glb`
- `public/models/dungeon-wall-half.glb`
- `public/models/ruins/arch_gothic.glb`
- `public/models/ruins/arch_round_columns.glb`
- `public/models/ruins/column_round.glb`
- `public/models/ruins/column_square.glb`
- `public/models/ruins/stairs.glb`
- `public/models/ruins/stairs_wide.glb`
- `public/models/ruins/statue_fox.glb`
- `public/models/ruins/statue_stag.glb`
- `public/models/ruins/wall_arch_broken.glb`
- `public/models/ruins/wall_arch_gothic.glb`
- `public/models/ruins/wall_arch_overgrown.glb`
- `public/models/ruins/wall_hole.glb`
- `public/models/ruins/wall_overgrown.glb`
- `public/models/ruins/floor_diamond.glb`
- `public/models/ruins/floor_large.glb`
- `public/models/ruins/floor_squares.glb`
- `public/models/ruins/floor_standard.glb`
- `public/models/ruins/floor_hole_corner.glb`
- `public/models/ruins/floor_hole_straight.glb`
- `public/models/ruins/floor_tree.glb`
- `public/models/ruins/trapdoor.glb`

## Import Rules

- Store raw downloaded source files outside `public/` until reviewed.
- Keep a small `CREDITS.md` entry for every non-CC0 asset.
- Avoid CC-BY-SA/GPL art for now unless the release implications are intentional.
- Convert final game-ready models to `.glb` under `public/models/`.
- Keep Blender generation or edit scripts under `scripts/blender/` when possible.

## Rune Drift Style Targets

- Character silhouette: small hood, glowing mask, short cloak, floating rune shards.
- Enemy silhouette: readable shapes from top-down distance, no tiny details.
- Map silhouette: combat center remains clean; detail lives on the outer ring.
- Direct source variants should still get in-game readability layers: ground auras, hit flashes, nameplates, and silhouette lights.
