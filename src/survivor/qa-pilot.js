import { SPORE, HOUND, GIANT } from './enemies.js';
import { trackedEncounter, encounterDistance } from './encounters.js';
// Development-only input driver. Uses ordinary upgrades and simulation time; never changes combat stats.
import { SLAM } from './game.js';
import { BOSS } from './boss.js';
export const routes = {
  blade: ['sweep', 'horizon', 'detonation', 'dawn', 'sword', 'orbit', 'vitality', 'fleet', 'magnet', 'comet', 'lunar', 'ember', 'heal'],
  comet: ['wildfire', 'duelist', 'horizon', 'comet', 'ember', 'fleet', 'magnet', 'vitality', 'orbit', 'sword', 'lunar', 'dawn', 'heal'],
  lunar: ['bulwark', 'sweep', 'detonation', 'lunar', 'orbit', 'vitality', 'magnet', 'fleet', 'sword', 'ember', 'dawn', 'comet', 'heal']
};
export function createPilot(route) {
  const base = route.replace('-alternate', '');
  if (!routes[base]) throw new Error('Unknown diagnostic route');
  const priorities = [...routes[base]];
  if (route.endsWith('-alternate')) priorities[0] = { blade: 'duelist', comet: 'detonation', lunar: 'horizon' }[base];
  return {
    choose: game => priorities.find(key => game.choices.includes(key)) ?? game.choices[0],
    relic: game => (base === 'comet' ? ['coal','sail','dew','briar','fang','bell'] : base === 'lunar' ? ['bell','briar','dew','coal','fang','sail'] : ['fang','dew','briar','coal','bell','sail']).find(key=>game.relicChoices.includes(key)),
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
      const event = trackedEncounter(game);
      if (event && !(event.kind === 'chest' && event.state === 'active')) {
        const d = encounterDistance(game,event);
        // Follow visible objective markers. Keep ordinary evasion when inside the ritual.
        dx = d > 24 ? (event.x-player.x)/(d||1) : 0;
        dy = d > 24 ? (event.y-player.y)/(d||1) : 0;
      }
      for (const enemy of game.enemies) {
        const x = player.x - enemy.x,
          y = player.y - enemy.y,
          distance = Math.hypot(x, y);
        // The short-range rune route must enter its weapon reach rather than kite outside it.
        const retreatRadius = base === 'lunar' ? (route.endsWith('-alternate') ? 100 : 58) : 95;
        if (distance < retreatRadius) {
          dx += x / (distance || 1) * (retreatRadius - distance) / 35;
          dy += y / (distance || 1) * (retreatRadius - distance) / 35;
        }
      }
      for (const cloud of game.spores) {
        const x=player.x-cloud.x,y=player.y-cloud.y,d=Math.hypot(x,y);
        // Keep crowd avoidance while stepping away from a visible cloud.
        if(cloud.age>=.2 && d<SPORE.radius+40) {const force=3*(SPORE.radius+40-d)/(SPORE.radius+40);dx+=(x||1)/(d||1)*force;dy+=y/(d||1)*force;}
      }
      // Use only visible warnings, with a 200ms reaction. Never change HP or damage rules.
      // This makes the close-range route comparison include the evasion its role requires.
      for (const enemy of game.enemies) {
        const slam = enemy.slam;
        if (slam && !slam.hit && slam.age >= .2 && Math.hypot(player.x - slam.x, player.y - slam.y) < (enemy.elite ? SLAM.radius : GIANT.radius) + 26) {
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
        const hunt=enemy.hunt;
        if(hunt && hunt.age>=.2 && hunt.age<HOUND.windup+HOUND.duration) {
          const x=player.x-hunt.x,y=player.y-hunt.y,c=Math.cos(hunt.angle),s=Math.sin(hunt.angle);
          const along=x*c+y*s,across=-x*s+y*c;
          if(along>-30 && along<HOUND.length+30 && Math.abs(across)<HOUND.width/2+26) {const side=across<0?-1:1;dx=-s*side;dy=c*side;break;}
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
