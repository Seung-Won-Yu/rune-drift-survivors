# Character and world readability

Keep the hooded Rune Warden and the existing Riftborn cast. Strengthen their silhouettes at the actual gameplay camera distance, using the authored atlas rather than adding model or image downloads.

## Character presentation

- The player sprite grows from 4.65 to 5.5 world units (18%). Camera framing, collision radius, movement, and weapon reach are unchanged.
- Neutral atlas backdrops are removed once before texture filtering. Mipmaps reduce small-scale shimmer, and luminance-based lifting preserves the teal cloak and gold armor instead of washing every RGB channel toward gray. Every player and enemy animation cell retains visible artwork and transparent surroundings.
- The keyed canvas is cached per source image. Each consumer owns and disposes its GPU texture; the original loaded image is preserved. This adds a cached RGBA canvas and mip levels, without increasing network payload or draw calls for the sprites.
- Remove the extra cone legs, floating staff duplicate, shoulder shards, and permanent body halo. The authored idle, walk, cast, and hurt poses remain the character's animation source.
- A steady cyan ground ring and contact shadow identify the player. The marker changes to coral on a hit. A small directional triangle appears while moving; build-colored trails and a cast pulse emphasize actions. Ground markers draw above terrain decorations and below actor sprites so the central platform cannot hide them.

## Enemies, effects, and environment

- All common, elite, and boss sprites share the corrected atlas filtering. Stronger contact shadows anchor them to the terrain; their role silhouettes and existing warning shapes remain intact.
- Golem/elite decorative floor accents and filled elite/boss auras recede during a contact windup or charge. Attack telegraphs and charge direction remain available at every quality setting.
- Stage-three orb crowns are reserved for high quality. Projectile bodies, weapon radii, trails, damage, and threat signals are unchanged.
- Terrain highlights and normal-map strength are reduced. Fixed decorative rings use subdued stone colors, giving gold seals and coral warnings more visual separation.
- The crystal at the exact spawn position becomes a shallow stone inlay, removing the decorative spike that overlapped the player's boots.
- Mobile objective cards use a compact layout below navigation. Removing the inherited vertical translation fixes their overlap with the timer. On portrait screens no taller than 640px, contextual guidance sits above the touch controls to keep the enlarged character fully visible; desktop objectives retain their existing detail.

## Verification

The focused browser checks cover matte behavior, all 80 authored animation cells, the desktop threat reference scene, movement/dash/hit/pause, and mobile casting scenes. The viewport matrix covers 320×568, 360×740, 568×320, and 740×360, including low/balanced/high quality at 360×740. It checks objective/navigation separation and captures each scene for visual inspection.

On 2026-09-07 the complete 84-case smoke suite passed in 2.0 minutes, including the desktop and mobile stress checks. After the final spawn inlay adjustment, eight relevant captures/checks passed. The final short-phone layout then passed 16 focused cases covering the cast, objectives, detour, opening guidance, and upgrade choices. The final production build and whitespace checks passed. An independent code review found no actionable defect in the texture lifetime, UV mapping, quality variants, or updated presentation. Cold-load CPU work and memory on a low-end physical phone remain unmeasured: the compatibility conversion processes roughly 4.7 million source pixels once, while the frame-rate checks measure gameplay after loading.

Before images are saved locally in `output/playwright/world-before/`. The local comparison page is `output/world-design-comparison.html`. Source atlas files are unchanged. Physical-phone performance and first-time-player usability have not been measured by these browser checks.
