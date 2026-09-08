// Development-only input driver. Uses ordinary upgrades and simulation time; never changes combat stats.
import { SLAM } from './game.js';
import { BOSS } from './boss.js';
export const routes = {
  blade: ['dawn', 'sword', 'orbit', 'vitality', 'fleet', 'magnet', 'comet', 'lunar', 'ember', 'heal'],
  comet: ['comet', 'ember', 'fleet', 'magnet', 'vitality', 'orbit', 'sword', 'lunar', 'dawn', 'heal'],
  lunar: ['lunar', 'orbit', 'vitality', 'magnet', 'fleet', 'sword', 'ember', 'dawn', 'comet', 'heal']
};
export function createPilot(route) {
  if (!routes[route]) throw new Error('Unknown diagnostic route');
  return {
    choose: game => routes[route].find(key => game.choices.includes(key)),
    move(game) {
      let dx = 0,
        dy = 0;
      const {
        player
      } = game;
      const nearest = [...game.gems].sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];
      if (nearest) {
        dx = nearest.x - player.x;
        dy = nearest.y - player.y;
        const distance = Math.hypot(dx, dy) || 1;
        dx /= distance;
        dy /= distance;
      }
      for (const enemy of game.enemies) {
        const x = player.x - enemy.x,
          y = player.y - enemy.y,
          distance = Math.hypot(x, y);
        // The short-range rune route must enter its weapon reach rather than kite outside it.
        const retreatRadius = route === 'lunar' ? 70 : 95;
        if (distance < retreatRadius) {
          dx += x / (distance || 1) * (retreatRadius - distance) / 35;
          dy += y / (distance || 1) * (retreatRadius - distance) / 35;
        }
      }
      // Use only visible warnings, with a 200ms reaction. Never change HP or damage rules.
      // This makes the close-range route comparison include the evasion its role requires.
      for (const enemy of game.enemies) {
        const slam = enemy.slam;
        if (slam && !slam.hit && slam.age >= .2 && Math.hypot(player.x - slam.x, player.y - slam.y) < SLAM.radius + 26) {
          let x = player.x - slam.x,
            y = player.y - slam.y;
          if (Math.hypot(x, y) < 1) {
            x = player.x - enemy.x;
            y = player.y - enemy.y;
          }
          const distance = Math.hypot(x, y) || 1;
          dx = x / distance;
          dy = y / distance;
          break;
        }
        const pattern = enemy.pattern;
        if (enemy.boss && pattern?.kind === 'charge' && pattern.age >= .2 && pattern.age < BOSS.windup + BOSS.chargeDuration) {
          const x = player.x - pattern.x,
            y = player.y - pattern.y,
            c = Math.cos(pattern.angle),
            s = Math.sin(pattern.angle);
          const along = x * c + y * s,
            across = -x * s + y * c;
          if (along > -45 && along < BOSS.chargeLength + 45 && Math.abs(across) < BOSS.chargeWidth / 2 + 26) {
            const side = across < 0 ? -1 : 1;
            dx = -s * side;
            dy = c * side;
            break;
          }
        }
      }
      return {
        x: dx,
        y: dy
      };
    }
  };
}
