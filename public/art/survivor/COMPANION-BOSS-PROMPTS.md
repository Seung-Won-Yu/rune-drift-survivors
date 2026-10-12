# Companion and boss motion prompts

Generated with the built-in `image_gen` tool on 2026-10-12. True-alpha PNG originals were converted to WebP with `cwebp -q 92 -alpha_q 100`, without changing source dimensions. Each 1024 × 1536 sheet contains 24 authored poses. Existing source art remains available.

## hero-ember-motion-v1.webp

Reference: `hero-ember.png`.

Saved asset: `public/art/survivor/hero-ember-motion-v1.webp`.

Exact submitted prompt:

```text
Create a production 2D animation sprite atlas for the existing Ash & Amber web survivor game. Image 1 is an IDENTITY AND ART STYLE REFERENCE, not a grid to copy. Re-draw this SAME red-haired Ember caster: amber eyes, russet pointed wide-brim hat with a brass circular clasp, cream short coat, brown gloves and boots, shoulder pouch, and a small ROUND AMBER GLASS FLASK held in her right hand. No staff, sword, shield, redesign or new accessories.
Output: true transparent RGBA portrait canvas, preferably 1024x1536, EXACTLY FOUR equal columns by SIX equal rows (24 separate square cells). Every sprite wholly contained in its own cell, with generous 15% margins. No overlap between cells, labels, numbers, borders, gridlines, floor, cast shadows, trails, floating symbols or detached effects. Every full body faces RIGHT in the same three-quarter slightly elevated camera. Same body scale, head size, hat, flask, costume, light and crisp dark contour in all 24 frames. Clear two-tone cartoon shading, readable small in-game. Planted feet at a consistent baseline inside each cell, torso around the same horizontal position. Show real limb, hip, shoulder and hat movement, not duplicates.
Read row-major:
ROWS 1–2 (frames 0–7): ONE coherent eight-frame brisk WALK cycle, alternating foot contacts/passing/lift and natural opposing shoulders. Hat brim and coat tails lag gently; flask stays gripped.
ROW 3 (frames 8–11): four chronological NORMAL CAST RELEASE AND RECOVERY frames. IMPORTANT: the projectile is emitted instantly at frame8: outstretched flask hand points right, torso follows arm, opposite hand balances. Frame9 absorbs casting recoil; frame10 arm lowers, knees recover; frame11 returns to ready stance. This is release→follow-through→recovery→ready, not a pre-fire windup. Draw only the body and flask; the engine draws the flying flame.
ROW 4 (frames 12–15): four stronger CHARGED CAST RELEASE AND RECOVERY frames. Frame12 visibly deeper forward reach with both planted feet and a brighter warm flask, frame13 larger recoil/hat lag, frame14 settles shoulders/arm, frame15 ready. Same flask and body scale. No fireball or large glow.
ROW 5 (frames16–19): four HIT REACTION frames: initial shoulder recoil, maximum off-balance stance with bracing foot, returning balance, ready; keep flask held and hat intact.
ROW 6 (frames20–23): four DEFEAT frames: stagger, knees buckle, falling sideways, motionless body lying on her side with flask beside hand. No gore, no vanishing body.
These are coherent animation drawings of one character, with full props visible in EVERY cell and no missing hands or merged adjacent sprites. Transparent empty space, not black/white/checkerboard background.
```

## hero-grove-motion-v1.webp

Reference: `hero-grove.png`.

Saved asset: `public/art/survivor/hero-grove-motion-v1.webp`.

Exact submitted prompt:

```text
Create a production 2D animation sprite atlas for Ash & Amber. Image 1 is an IDENTITY AND ART STYLE REFERENCE only. Re-draw the SAME blue-haired Grove rune guardian: navy short hair, cream crescent headband, ivory shoulder mantle, navy and muted sage tunic panels, brown gloves/boots, brass clasps, and the ROUND SAGE RUNE DISC held in front of the body. Keep its circular spiral/rune pattern consistent. No new weapon, sword, staff, cape design, accessories or armor.
Output true transparent RGBA, portrait 1024x1536 preferred, EXACTLY 4 columns x 6 rows, 24 separate square cells. Generous 15% empty margins in EACH cell, no clipped disc, hands, headband or feet; no overlaps. Constant full-body size, proportions, costume, viewpoint, outline thickness and lighting in all cells. Three-quarter slightly elevated game view facing RIGHT. Torso at same horizontal position and planted feet at common baseline. Crisp dark contours, readable two-tone cartoon shading matching the reference. No labels, text, grid, background, floor, cast shadows, particle rings, floating glyphs, flying projectiles or glow outside the body.
ROW-MAJOR animation plan:
ROWS1–2 frames0–7: ONE eight-frame purposeful WALK cycle. Alternate right/left planted foot contacts, recoil, passing and lift, hips and shoulders counterrotate. Disc is steadily gripped, cloak/mantle edges lag lightly. Show actual alternating leg shapes, not nearly duplicated stills.
ROW3 frames8–11: four RUNE CONTACT RELEASE AND RECOVERY frames. Frame8 immediately opens the disc-bearing arm toward the right with both feet grounded; frame9 body absorbs pulse, frame10 arm draws disc back, frame11 returns to ready. The rune has already struck at frame8; do NOT draw a pre-fire windup or a detached orb.
ROW4 frames12–15: four DISTINCT BLOCK / ABSORPTION frames. Frame12 plants feet wide and braces the round disc forward at chest height, frame13 leans back into a strong blocked hit with supporting rear foot, frame14 settles knees and shoulders, frame15 recovers normal disc-held stance. Keep face determined with eyes open. The shield stays whole; no detached barrier or large light effect.
ROW5 frames16–19: four actual BODY HURT frames, different from blocking. Initial torso recoil, greater off-balance chest/shoulder motion, foot catches balance, ready. Disc remains held but cannot prevent this body recoil.
ROW6 frames20–23: four DEFEAT frames: knees weaken, drops to knee, collapses sideways, lies motionless on side with disc resting nearby. No gore, no vanishing costume.
Chronological poses must keep the same anatomy and disc; the character genuinely bends joints rather than being scaled/rotated copies. True transparent empty areas, no solid background or checkerboard.
```

## ash-sovereign-motion-v1.webp

Reference: `ash-sovereign.png`.

Saved asset: `public/art/survivor/ash-sovereign-motion-v1.webp`.

Exact submitted prompt:

```text
Create a production animation sprite atlas of the SAME Ash Sovereign boss from Image1 for the Ash & Amber 2D cartoon survivor. Image1 is an identity and art style reference, not a layout. Preserve the ivory pointed animal-mask face with TWO amber eyes, huge brown branch antlers, heavy charcoal bark torso, angular amber chest core, rust/burgundy layered leaf mantle, root hands and broad root feet. No weapons, new armor, redesign or new characters. A threatening compact forest monarch in crisp outlined two-tone cartoon art matching the reference.
Output true transparent RGBA on a portrait 1024x1536 canvas, EXACTLY 4 equal columns and 6 equal rows (24 distinct full-body poses). Each pose is contained in its own square cell with generous margins; antlers and hands never touch neighbors. Same full-body scale, head/antler dimensions, line weight, costume, lighting, camera and three-quarter elevated viewpoint in ALL cells, facing RIGHT. Torso around a fixed cell horizontal center, planted feet share baseline. No text, grid, labels, shadows, floor, circles, beams, particles, flying thorns or detached effects. Only character action; the game engine draws effects.
Read ROW-MAJOR:
ROW1 frames0–3: FOUR slow heavy approach/walk poses, opposing foot contacts, shoulder weight shift and lagging leaf mantle.
ROW2 frames4–7: frame4 entrance waking from low folded stance, frame5 fully rising with chest exposed. Frame6 CHARGE PREPARATION lowers body, draws both root arms rearward and plants rear foot; frame7 MAXIMUM COILED CHARGE, mask low and gaze right, mantle bunches behind. This is genuine joint movement, not duplicate frames.
ROW3 frames8–11: frame8 FORWARD CHARGE LAUNCH, torso low and horns thrust right, rear foot driving; frame9 sustained charge with one planted front foot/root claws forward and mantle trailing; frame10 braking compression with front foot braced and arms lowered; frame11 settled normal ready stance.
ROW4 frames12–15: frame12 THORN VOLLEY PREPARATION, one hand gathered near amber chest core; frame13 full gathered aim with hand/claws cupped and thorn-like bark tips emerging from the forward forearm. Frame14 EXACT RELEASE: root arm extends toward right, claw/forearm straight and chest opens, mantle follows. Do not draw the flying thorns. Frame15 hand retracts and shoulders start settling.
ROW5 frames16–19: frame16 completed volley recovery/ready. Frame17 enraged heavy walking contact with lower shoulders and narrowed amber eyes. Frame18 enraged opposing step with mantle raised slightly. Frame19 FIRST HIT REACTION: chest jerks, mask turns slightly, supporting knee bends; no detached debris.
ROW6 frames20–23: frame20 stronger hit recoil and bracing foot; frame21 lethal stagger/knees buckle; frame22 collapsed onto one side, antlers completely visible; frame23 motionless prone body and flattened leaf mantle. No gore or disintegration.
24 coherent chronological drawings, full antlers/limbs intact in every cell. True transparent empty space, no colored/black/white/checkerboard background.
```

