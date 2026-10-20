# Combat momentum

This pass concentrates spectacle at the attack, travel and impact. Damage rules, hit timings, rewards and saves are unchanged.

- Painted companions carry the existing anticipation, contact and recovery through a small foot-anchored body shift. Rotation is capped at 0.06 radians and scale at ±6%; authored limb poses retain priority. Hurt and defeat suppress attack weight, and reduced motion removes it.
- Sword strokes gain separated inner ribbons within the existing short blade arc. No range sector or target tether is added.
- Flames and evolved crescents leave a short wake aligned with their actual velocity. Wake length is capped and grows from the shot's lifetime; flutter freezes when the simulation pauses. Reduced motion keeps a fixed projectile shape.
- Rune wakes follow a short section behind each actual orbiting head. They disappear in reduced motion and never complete a circle around the character.
- Fire bursts expand quickly, then lose their hot core and shed three chips. Direct weapon kills also shed three directional fragments. These are draw-time shapes, so particle arrays and entity budgets do not grow.
- Authored ordinary creature hit poses now use the existing brief compression, capped to preserve the illustration. Bosses and active hound/slam attacks keep their attack silhouette.

## Verification

The focused unit pass covers unchanged real-hit thresholds and damage, pause stability, reduced motion, deterministic bounded geometry, backwards wakes, and suppression of attack weight during hurt/defeat. Browser checks cover real contacts, all three companions, evolved attacks, elite finishes, dense combat and both desktop and phone entity-cap/performance fixtures.

The local pass completed 75 unit tests and 20 focused browser cases. The sustained-load fixtures at 1280×720, 390×844 and 740×360 recorded p95 frame intervals of 16.7–16.8ms with no frames over 50ms. This is desktop-browser evidence at those viewports, not a physical-phone benchmark. In-app inspection also covered movement during crowded rune combat and a manually controlled boss-practice fight through defeat.

Local in-app browser inspection uses disposable development previews:

```text
?preview=action-readability
?preview=projectile-readability
?preview=feel-sweep
?preview=feel-detonation
?preview=feel-horizon
?preview=boss-practice
```

These are controlled visual fixtures, not evidence of an ordinary completed run. They neither read nor write the saved journey and are disabled in production. Generated captures remain in ignored `output/playwright/survivor/`.
