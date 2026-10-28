import { getCharacter } from './characters.js';
import { orbitOffset } from './orbit-shape.js';

export const LANDING_COMBO = Object.freeze({ orbitDuration: .6, swordQueue: .65, spacing: 18 });
export const createLandingCombo = () => ({ sword: null, orbitRemaining: 0, orbitAngle: 0, orbitStep: 0 });
export const secondaryWeapon = (game, key) => getCharacter(game.characterId).weapon !== key;
export function landingComboHint(game, key) {
  if (!secondaryWeapon(game, key)) return '';
  return {sword: '돌파 착지 방향으로 이어 베기', ember: '돌파 착지 방향으로 불씨 발사', orbit: '돌파 착지 후 룬 고속 회전'}[key] ?? '';
}

export function queueLandingCombo(game) {
  const combo = game.landingCombo, angle = Math.atan2(game.burst.y, game.burst.x);
  if (game.ranks.sword && secondaryWeapon(game, 'sword')) combo.sword = {angle, until: game.time + LANDING_COMBO.swordQueue};
  if (game.ranks.orbit && secondaryWeapon(game, 'orbit')) combo.orbitRemaining = LANDING_COMBO.orbitDuration;
  return game.ranks.ember && secondaryWeapon(game, 'ember') ? angle : null;
}

export function advanceLandingCombo(game, dt) {
  const combo = game.landingCombo;
  combo.orbitStep = Math.min(dt, combo.orbitRemaining) / LANDING_COMBO.orbitDuration * Math.PI * 2;
  combo.orbitRemaining = Math.max(0, combo.orbitRemaining - dt);
  combo.orbitAngle = (combo.orbitAngle + combo.orbitStep) % (Math.PI * 2);
  if (combo.sword && game.time > combo.sword.until) combo.sword = null;
}

// The accelerated heads follow these same physical arcs in rendering. Sample
// the swept arc, including movement/stretch, so a 30Hz frame cannot skip a foe.
// All samples still share each victim's ordinary 0.4s rune contact gate.
export function sweptOrbitHeads(heads, before, player, arc) {
  if (!before || before.heads.length !== heads.length || arc <= 0) return heads;
  return heads.flatMap((head, index) => {
    const old = before.heads[index];
    const stretch = Math.max(...[old.shape, head.shape].flatMap(s => [Math.abs(s.xx) + Math.abs(s.xy), Math.abs(s.yy) + Math.abs(s.xy)]));
    const radius = Math.max(old.radius, head.radius);
    const shapeTravel = radius * (Math.abs(old.shape.xx-head.shape.xx) + 2*Math.abs(old.shape.xy-head.shape.xy) + Math.abs(old.shape.yy-head.shape.yy));
    const distance = arc * radius * stretch + shapeTravel + Math.hypot(player.x-before.x, player.y-before.y);
    const steps = Math.max(1, Math.ceil(distance / LANDING_COMBO.spacing));
    return Array.from({length: steps + 1}, (_, step) => {
      const t = step / steps, shape = {};
      for (const key of ['xx','xy','yy']) shape[key] = old.shape[key] + (head.shape[key]-old.shape[key])*t;
      const angle = old.angle + arc*t, r = old.radius + (head.radius-old.radius)*t;
      const offset = orbitOffset(angle, r, shape);
      return {...head, angle, x: before.x+(player.x-before.x)*t+offset.x, y: before.y+(player.y-before.y)*t+offset.y};
    });
  });
}
