# Ash Sovereign asset provenance

2026-09-08 · Built-in OpenAI image generation, followed by a built-in background-extraction edit.

Final game asset: `ash-sovereign.png`, 1774 × 887 RGBA, four columns and two rows. The enemy atlas `enemies.png` was a style reference only. The first generated image had a baked checkerboard and was rejected for gameplay. The second output has a real alpha channel, confirmed with image metadata. The selected file was copied without additional raster editing.

Walk row: alternating steps. Attack row: gather, raise hands, thrust, recover. `render.js` uses measured attack-row source edges `[0,443.5,887,1364,1774]` to include the extended hand without the neighboring pose. Feet use separate row anchors. These are renderer source rectangles, not raster modifications.

## Generation prompt

> Use case: stylized-concept. Asset type: cartoon 2D survivor game BOSS animation atlas. Input image is STYLE REFERENCE ONLY (forest enemies), not an edit target. Create a new distinct boss named Ash Sovereign: an imposing compact forest spirit king, pale ivory wooden mask with two amber eye holes, huge branched ash-grey antler crown, charcoal bark body, flowing deep burgundy leaf mantle, amber crystal embedded in chest, two oversized root hands with hooked fingers, short sturdy root feet. Readable noble ominous silhouette, NOT the moss brute, NO club, NO shield. Match reference bold dark outlines, two-tone cel shading, 3/4 slightly elevated game perspective, crisp compact fantasy proportions. Genuine transparent alpha PNG background, no checkerboard painted in, no ground shadow, no scenery, no labels, no frame lines. Exact evenly spaced 4 columns x 2 rows grid, 8 sprites, each cell square and identical size. All sprites face right and slightly toward viewer. Entire character including antlers stays within central 72% width and 76% height of every cell; feet share the same anchor at 86% cell height. Row 1 four alternating walk keyframes, same character and proportions. Row 2 four attack keyframes: gather energy with hands close to chest, both hands raised with crown upright, hands thrust forward, return to neutral. Keep crown and body identity exactly consistent across all eight cells. No particles, beams, text or huge glow painted into atlas; attack effects will be rendered in game code.

## Background extraction prompt

> Use case: background-extraction. Edit target: attached boss sprite atlas. Preserve every character exactly, every pose and position and the exact 4 by 2 grid. Remove the ENTIRE light grey/white checkerboard patterned background and replace it with actual zero-alpha transparency. This is for an in-game texture, so output a true RGBA PNG with alpha, not an RGB image with a drawn checkerboard. Do not change the boss art or pale ivory mask. Remove only the surrounding backdrop, including gaps between antlers and fingers. No added drop shadows, no matte edge. Keep exact canvas framing.
