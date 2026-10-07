# Illustrated sanctuary and forest floor

Generated on 2026-10-07 with the built-in OpenAI image generation tool. These are decorative environment illustrations for this project; character identity, collision rules and enemy warnings remain separate. Original source PNGs remain in the generation tool's task directory. Delivery encoding uses Pillow's WebP encoder, preserving the generated composition and dimensions.

| Asset | Source image | Delivered size | Encoding |
| --- | --- | --- | --- |
| `forest-sanctuary-v2.webp` | `exec-4a86a65b-c6fa-4372-8960-88aedc64bd14.png` | 1536 × 1024, 335,312 bytes | quality 90, method 6 |
| `forest-ground-v1.webp` | `exec-2b49ae60-74a6-46bf-b41f-3335d6890898.png` | 1254 × 1254, 239,638 bytes | quality 88, method 6 |

The sanctuary uses the previously generated `forest-camp-v1.webp` as a visual reference. It fills the lobby and codex background; a smaller crop appears in mobile preparation and results. It contains no character or UI text. The ground is generated independently, sampled once into a 512px Canvas texture and repeated behind actors and warnings. No image decoding, random ground generation or filter is repeated per frame.

## Sanctuary prompt

Use case: stylized-concept. Create a new finished panoramic environment illustration for the browser fantasy survivor game Ash & Amber, matching the clean ink outlines, richly painted cel shading, and dark forest / warm amber palette of the supplied forest reference. This is a production UI background, not a screenshot or mockup. Composition: 3:2 landscape. The LEFT HALF is the memorable visual: an ancient broken crown-shaped stone arch embraced by huge twisted ash-tree roots, a golden amber light shining through it into a dusky pine forest, a few pale wildflowers and luminous motes, layered blue-green forest depth. At the lower-left/center (roughly 35% width, 75% height) provide a broad quiet mossy stone landing where a separate character sprite will stand. Keep the arch's striking shape and golden focal light in the upper-left third, visible above the character. The RIGHTMOST 40 percent is quieter shadowed tree trunks and deep pine-green atmosphere, because an opaque parchment UI panel will cover it. Foreground dark leaf silhouettes naturally vignette the two bottom corners. Handcrafted, lush, sophisticated 2D animated fantasy film background, controlled brush texture, clear large shapes, rich restrained golden lighting; avoid photorealistic rendering or 3D game-engine look. No characters, no weapons, no lettering, no logos, no UI, no borders, no artificial blur. Preserve the reference's world and cartoon-friendly style, but make this a new composition built around the crown arch and standing platform.

## Ground prompt

Use case: stylized-concept. A production game texture: perfectly top-down, square, seamlessly tileable forest floor for a premium 2D cartoon survivor game named Ash & Amber. Entire image is walkable FLAT GROUND, no horizon, no perspective, no borders. Hand-painted restrained cel-shaded background, subtle brush detail, muted deep pine green and moss-grey with hints of brown earth, all colors close in value and low contrast. Broad calm irregular patches of short moss, barely visible old stone flecks, a sparse handful of tiny dry ash leaves and fine root veins, gentle material variation. 80 percent quiet open negative space so small enemies, XP gems, characters and colored danger warnings remain unmistakable over it. Seamless matching all four edges, consistent diffuse overhead light, no center focal point, no repeated circles, no radial light, no large rocks, no flowers, no mushrooms, no shrubs, no trees, no objects, no creatures, no shadows cast by unseen objects, no magical runes, no text or UI. A sophisticated illustrated game ground tile, clearly painted, not photorealistic and not pixel art. Target square 1024 by 1024 composition.

## Code-drawn art

`src/survivor/ui-art.js` contains the original broken-crown/seed chapter crest. `collection-art.js` adds distinct filled illustrations for fleet feet, collection range, maximum health and healing: feathered boot, lodestone, living wooden heart and leaf flask. They extend the existing collection palette and outlines without adding discoveries or changing rewards.
