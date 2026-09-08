# Companion atlas provenance

Generated with OpenAI image generation, 2026-09-08. Reference: this project's `player.png`, cartoon rows only. No external game artwork was used as a reference.

Each final PNG is 1254 × 1254 RGBA. Twelve poses: four walk, anticipation/action/follow-through/recovery, two hurt poses/kneeling/fallen. The first generations had painted checkerboards and were rejected as runtime assets. Transparency extraction was performed with image generation; no raster post-processing scripts were used.

## Original prompts

### ash

Use case: stylized-concept. Asset type: production 2D cartoon survivor HERO sprite atlas. Style reference is the CARTOON BOTTOM HALF of supplied image only; NO pixel art. Bold clean dark outlines, two-tone cel shading, compact cute fantasy proportions, 3/4 slightly elevated game perspective. Create EXACT 4 columns by 3 rows, 12 sprites, square equal cells. Uniform character size and identity across every pose. All face right and slightly toward viewer. Full character and weapons fit inside central 72% cell width and height with generous blank padding; feet anchor at 86% cell height. Real transparent alpha PNG background, no painted checkerboard, no ground/shadow, no text, no frame lines. Row 1 four alternating walking keyframes. Row 2 four action keyframes: anticipation, decisive attack/cast, follow-through, recovery. Row 3: small hit recoil, stronger hit recoil, kneeling defeat, lying defeated on side. NO blood, no death symbols, no particles or glow trails; effects drawn by game code. Preserve exact 4x3 grid. Subject: keep the supplied cartoon swordsman's identity: tousled ash silver hair, amber eyes, short teal cloak with round bronze brooch, cream tunic, dark gloves and boots, short wide brass sword. No hat, no helmet. Row 2 swing the brass sword; do NOT paint an arc or spark around sword.

### ember

Use case: stylized-concept. Asset type: production 2D cartoon survivor HERO sprite atlas. Style reference is the CARTOON BOTTOM HALF of supplied image only; NO pixel art. Bold clean dark outlines, two-tone cel shading, compact cute fantasy proportions, 3/4 slightly elevated game perspective. Create EXACT 4 columns by 3 rows, 12 sprites, square equal cells. Uniform character size and identity across every pose. All face right and slightly toward viewer. Full character and weapons fit inside central 72% cell width and height with generous blank padding; feet anchor at 86% cell height. Real transparent alpha PNG background, no painted checkerboard, no ground/shadow, no text, no frame lines. Row 1 four alternating walking keyframes. Row 2 four action keyframes: anticipation, decisive attack/cast, follow-through, recovery. Row 3: small hit recoil, stronger hit recoil, kneeling defeat, lying defeated on side. NO blood, no death symbols, no particles or glow trails; effects drawn by game code. Preserve exact 4x3 grid. Subject: new female ember alchemist, copper-red bob haircut, expressive amber eyes, broad brim russet pointed witch hat with brass clasp, cream short coat with warm burnt-orange lining, dark leggings and ankle boots, small glowing amber flask held in right hand, leather satchel. No sword, no long staff. A warm, agile silhouette distinct from swordsman. Row 2 gather and release fire from the flask with hand gesture, but no external flames/particles; flask is a simple warm yellow shape.

### grove

Use case: stylized-concept. Asset type: production 2D cartoon survivor HERO sprite atlas. Style reference is the CARTOON BOTTOM HALF of supplied image only; NO pixel art. Bold clean dark outlines, two-tone cel shading, compact cute fantasy proportions, 3/4 slightly elevated game perspective. Create EXACT 4 columns by 3 rows, 12 sprites, square equal cells. Uniform character size and identity across every pose. All face right and slightly toward viewer. Full character and weapons fit inside central 72% cell width and height with generous blank padding; feet anchor at 86% cell height. Real transparent alpha PNG background, no painted checkerboard, no ground/shadow, no text, no frame lines. Row 1 four alternating walking keyframes. Row 2 four action keyframes: anticipation, decisive attack/cast, follow-through, recovery. Row 3: small hit recoil, stronger hit recoil, kneeling defeat, lying defeated on side. NO blood, no death symbols, no particles or glow trails; effects drawn by game code. Preserve exact 4x3 grid. Subject: new sturdy lunar rune guardian, dark blue bob haircut, kind confident pale face, compact silver crescent diadem, broad pale stone shoulder armor over indigo tunic, sage green short tabard, dark boots and gloves, circular jade rune tablet held at chest height. No sword, no large shield blocking body. Stocky strong silhouette distinct from slender mage. Row 2 raise the round rune tablet and project magic with free hand; no external particles/glow.

## Transparency extraction

Extract the twelve character sprites from this atlas. Remove ALL of the checkerboard background and gray background texture completely, replacing it with REAL alpha transparency (RGBA PNG), not a painted checkerboard. Preserve original 4-column by 3-row layout, poses, costumes, clean dark outlines and artwork. No new background, no shadows, no new props. Keep each complete sprite contained inside its cell with transparent padding, feet consistent within each row.

The grove extraction still contained a checkerboard and was rejected. Final retry:

Background removal only. Isolate all 12 blue-haired rune guardian characters on transparent background. Deliver actual RGBA transparent PNG. The white and gray checker pattern in the source is unwanted image content; erase it completely to alpha zero. Retain exactly the 4 by 3 atlas layout and character illustration, no backdrop or floor. Transparent outside each character silhouette including gaps between limbs. Do not draw a checkerboard.

## Accepted source files

- hero-ash.png: exec-eff455ba-cb7d-402e-b165-9ae6d971899b.png
- hero-ember.png: exec-ac6e0b5f-2161-4603-9959-fd084e14fe5c.png
- hero-grove.png: exec-720465ba-bd78-4a54-a2c9-3375810db416.png

Original outputs are retained under the local Codex generated_images session directory. Runtime crop metadata lives in render.js: measured row boundaries prevent cutting feet and neighboring poses. Characters preserve atlas aspect ratio rather than stretching rectangular cells into squares. Small cloak/sword tips near ash attack cell borders are cropped; a future manually authored atlas can further polish these transitions.
