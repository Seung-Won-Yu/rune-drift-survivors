import { orbitPositions, stats, SLAM } from './game.js';
import { BOSS } from './boss.js';
import { nearestRecovery } from './field.js';
export async function loadArt(base) {
  const load = name => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`${name} 이미지를 불러오지 못했습니다.`));
    image.src = `${base}art/survivor/${name}.png`;
  });
  const [ash, ember, grove, enemies, boss] = await Promise.all([load('hero-ash'), load('hero-ember'), load('hero-grove'), load('enemies'), load('ash-sovereign')]);
  return {
    heroes: {
      ash,
      ember,
      grove
    },
    enemies,
    boss
  };
}
const noise = (x, y) => {
  const t = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return t - Math.floor(t);
};
function makeGround() {
  const tile = document.createElement('canvas');
  tile.width = tile.height = 512;
  const c = tile.getContext('2d');
  c.fillStyle = '#34453a';
  c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 180; i++) {
    const x = noise(i, 1) * 512,
      y = noise(i, 2) * 512,
      r = 8 + noise(i, 3) * 36;
    c.fillStyle = ['#314136', '#37483b', '#3a4b3b', '#3e4b38'][i % 4];
    c.beginPath();
    c.ellipse(x, y, r, r * .45, noise(i, 4) * 6, 0, Math.PI * 2);
    c.fill();
  }
  for (let i = 0; i < 90; i++) {
    const x = noise(i, 9) * 512,
      y = noise(i, 10) * 512;
    c.strokeStyle = i % 3 ? '#465a42' : '#283e34';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x - 3, y);
    c.lineTo(x - 4, y - 5);
    c.moveTo(x, y);
    c.lineTo(x + 1, y - 8);
    c.moveTo(x + 3, y);
    c.lineTo(x + 5, y - 4);
    c.stroke();
  }
  for (let i = 0; i < 24; i++) {
    const x = noise(i, 6) * 512,
      y = noise(i, 7) * 512;
    c.fillStyle = '#293c33';
    c.beginPath();
    c.ellipse(x, y, 4, 2, 0, 0, 7);
    c.fill();
    c.fillStyle = '#56614c';
    c.beginPath();
    c.ellipse(x, y - 2, 3, 2, 0, 0, 7);
    c.fill();
  }
  return tile;
}
export function createRenderer(canvas, art) {
  const ctx = canvas.getContext('2d', {
    alpha: false
  });
  let width = 0,
    height = 0,
    dpr = 1,
    scale = 1;
  const ground = makeGround();
  const pattern = ctx.createPattern(ground, 'repeat');
  // Canvas filters can force expensive software raster passes per actor. Bake
  // the identical hit tint once per atlas and keep drawing ordinary sprites.
  const hitArt = new Map();
  for (const image of [...Object.values(art.heroes), art.enemies, art.boss]) {
    const tinted = document.createElement('canvas');
    tinted.width = image.naturalWidth;
    tinted.height = image.naturalHeight;
    const tint = tinted.getContext('2d');
    tint.filter = 'brightness(1.65)';
    tint.drawImage(image, 0, 0);
    hitArt.set(image, tinted);
  }
  const vignette = document.createElement('canvas');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    scale = Math.min(1.2, Math.max(.68, Math.min(width / 800, height / 680)));
    vignette.width = Math.round(width * dpr);
    vignette.height = Math.round(height * dpr);
    const shade = vignette.getContext('2d');
    shade.scale(dpr, dpr);
    const gradient = shade.createRadialGradient(width / 2, height * .53, Math.min(width, height) * .22, width / 2, height * .5, Math.max(width, height) * .65);
    gradient.addColorStop(0, '#08150b00');
    gradient.addColorStop(1, '#07110eb0');
    shade.fillStyle = gradient;
    shade.fillRect(0, 0, width, height);
  }
  function shadow(x, y, rx, ry) {
    ctx.fillStyle = '#06171070';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, 7);
    ctx.fill();
  }
  function sprite(image, col, row, rows, x, y, size, flip = false, flash = false, attack = false, pose = {}) {
    const cw = image.naturalWidth / 4,
      sy = pose.rows ? pose.rows[row] : row * image.naturalHeight / rows,
      ch = pose.rows ? pose.rows[row + 1] - sy : image.naturalHeight / rows;
    const edges = pose.edges ?? (attack ? [0, 313, 657, 984, 1254].map(n => n * image.naturalWidth / 1254) : null);
    const sx = edges ? edges[col] : col * cw,
      sw = edges ? edges[col + 1] - sx : cw,
      drawHeight = pose.proportional ? size * ch / cw : size;
    ctx.save();
    ctx.translate(x + (pose.x || 0), y + (pose.y || 0));
    ctx.scale(flip ? -1 : 1, 1);
    ctx.rotate(pose.tilt || 0);
    ctx.scale(pose.sx || 1, pose.sy || 1);
    if (flash) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(flash ? hitArt.get(image) : image, sx, sy, sw, ch, -size * .48 + (sx - col * cw) * size / cw, -drawHeight * (pose.anchor ?? .89), sw / cw * size, drawHeight);
    ctx.restore();
  }
  function render(game, now = 0) {
    if (width !== canvas.clientWidth || height !== canvas.clientHeight) resize();
    const p = game.player;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#26382e';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height * .53);
    ctx.scale(scale, scale);
    ctx.translate(-p.x, -p.y);
    const viewW = width / scale,
      viewH = height / scale,
      left = p.x - viewW / 2,
      top = p.y - viewH * .53;
    ctx.fillStyle = pattern;
    ctx.fillRect(left - 50, top - 50, viewW + 100, viewH + 100);
    // Low-contrast stepping stones and flower clusters repeat in world coordinates.
    const spacing = 340;
    for (let gx = Math.floor(left / spacing) - 1; gx <= (left + viewW) / spacing + 1; gx++) for (let gy = Math.floor(top / spacing) - 1; gy <= (top + viewH) / spacing + 1; gy++) {
      const x = gx * spacing + noise(gx, gy) * 90,
        y = gy * spacing + noise(gy, gx) * 100;
      if (noise(gx + 30, gy) > .48) {
        ctx.fillStyle = '#2b3d3270';
        ctx.beginPath();
        ctx.ellipse(x, y, 49, 24, .3, 0, 7);
        ctx.fill();
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = i % 2 ? '#80714b88' : '#c3aa6880';
          ctx.beginPath();
          ctx.arc(x + noise(i + gx, gy) * 40 - 20, y + noise(i + gy, gx) * 22 - 11, 1.5, 0, 7);
          ctx.fill();
        }
      } else {
        shadow(x, y + 6, 21, 9);
        ctx.fillStyle = '#4a594b';
        ctx.beginPath();
        ctx.moveTo(x - 20, y);
        ctx.lineTo(x - 10, y - 13);
        ctx.lineTo(x + 12, y - 15);
        ctx.lineTo(x + 23, y - 3);
        ctx.lineTo(x + 14, y + 6);
        ctx.lineTo(x - 11, y + 7);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#62715a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 10, y - 13);
        ctx.lineTo(x + 12, y - 15);
        ctx.lineTo(x + 22, y - 3);
        ctx.stroke();
      }
    }
    // A quiet arrival circle is scenery, never a mission marker.
    ctx.strokeStyle = '#92a78318';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 88, 0, 7);
    ctx.stroke();
    ctx.strokeStyle = '#92a7830d';
    ctx.beginPath();
    ctx.arc(0, 0, 104, 0, 7);
    ctx.stroke();
    for (const gem of game.gems) {
      const size = gem.value >= 8 ? 7 : 4;
      const bob = reduced.matches ? 0 : Math.sin(gem.age * 3) * 1.5;
      shadow(gem.x, gem.y + 2, size + 2, 2);
      ctx.fillStyle = gem.value >= 8 ? '#bde9ed' : '#89d2ec';
      ctx.strokeStyle = '#244e60';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gem.x, gem.y - size - 3 + bob);
      ctx.lineTo(gem.x + size, gem.y - 3 + bob);
      ctx.lineTo(gem.x, gem.y + size - 3 + bob);
      ctx.lineTo(gem.x - size, gem.y - 3 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    for (const supply of game.supplies) {
      shadow(supply.x, supply.y + 3, 17, 6);
      ctx.save();
      ctx.translate(supply.x, supply.y - 12);
      ctx.strokeStyle = '#f5d69b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 12, 22, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#e4a26e';
      ctx.strokeStyle = '#423429';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-5, 0, 9, 0, Math.PI * 2);
      ctx.arc(5, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#a8d29a';
      ctx.beginPath();
      ctx.ellipse(4, -12, 9, 4, -.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff0c9';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(4, 0);
      ctx.moveTo(0, -4);
      ctx.lineTo(0, 4);
      ctx.stroke();
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#17251c';
      ctx.lineWidth = 4;
      ctx.strokeText('+25', 0, 35);
      ctx.fillStyle = '#ffe2ae';
      ctx.fillText('+25', 0, 35);
      ctx.restore();
    }
    for (const remnant of game.remnants) {
      const age = remnant.boss && game.outcome === 'victory' ? game.endAge ?? 0 : remnant.age;
      const progress = Math.min(1, age / remnant.life);
      ctx.globalAlpha = (1 - progress) * .72;
      sprite(remnant.boss ? art.boss : art.enemies, 2, remnant.boss ? 0 : remnant.type, remnant.boss ? 2 : 3, remnant.x, remnant.y, remnant.size, remnant.flip, false, false, {
        anchor: remnant.boss ? .95 : .89,
        sy: reduced.matches ? 1 : 1 - progress * .45,
        sx: reduced.matches ? 1 : 1 + progress * .13,
        tilt: reduced.matches ? 0 : progress * .14
      });
      ctx.globalAlpha = 1;
    }
    for (const boss of game.enemies.filter(e => e.boss)) {
      const pattern = boss.pattern;
      if (boss.entrance > 0) {
        ctx.strokeStyle = '#e9bd78';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, 55 + boss.entrance / BOSS.entrance * 22, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (!pattern || pattern.age >= BOSS.windup) continue;
      const progress = pattern.age / BOSS.windup;
      ctx.save();
      ctx.translate(pattern.x, pattern.y);
      ctx.rotate(pattern.angle);
      if (pattern.kind === 'charge') {
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#cf70443b';
        ctx.lineWidth = BOSS.chargeWidth;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(BOSS.chargeLength, 0);
        ctx.stroke();
        ctx.strokeStyle = '#f4c59aaa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -BOSS.chargeWidth / 2);
        ctx.lineTo(BOSS.chargeLength, -BOSS.chargeWidth / 2);
        ctx.moveTo(0, BOSS.chargeWidth / 2);
        ctx.lineTo(BOSS.chargeLength, BOSS.chargeWidth / 2);
        ctx.stroke();
        ctx.setLineDash([8, 9]);
        ctx.strokeStyle = '#ffb57a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(BOSS.chargeLength * progress, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffe4bc';
        ctx.beginPath();
        ctx.moveTo(BOSS.chargeLength + 10, 0);
        ctx.lineTo(BOSS.chargeLength - 8, -9);
        ctx.lineTo(BOSS.chargeLength - 8, 9);
        ctx.closePath();
        ctx.fill();
      } else {
        const count = boss.enraged ? 11 : 7;
        ctx.strokeStyle = '#eaa38980';
        ctx.lineWidth = 2;
        for (let i = 0; i < count; i++) {
          const angle = (i - (count - 1) / 2) * .24;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * 45, Math.sin(angle) * 45);
          ctx.lineTo(Math.cos(angle) * (80 + progress * 70), Math.sin(angle) * (80 + progress * 70));
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    // The target stays fixed after the windup begins. This circle shares the damage radius.
    for (const enemy of game.enemies) {
      if (!enemy.slam || enemy.slam.hit) continue;
      const slam = enemy.slam,
        progress = Math.min(1, slam.age / SLAM.windup);
      ctx.fillStyle = '#d8684430';
      ctx.strokeStyle = '#ffc39b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(slam.x, slam.y, SLAM.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#ff9869';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(slam.x, slam.y, SLAM.radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#eebda280';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(slam.x, slam.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `bold ${scale < 1 ? 17 : 12}px system-ui`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#281c18';
      ctx.lineWidth = 4;
      ctx.strokeText('내려찍기', slam.x, slam.y - SLAM.radius - 12);
      ctx.fillStyle = '#ffe0c0';
      ctx.fillText('내려찍기', slam.x, slam.y - SLAM.radius - 12);
      ctx.beginPath();
      ctx.moveTo(slam.x - 6, slam.y - 6);
      ctx.lineTo(slam.x + 6, slam.y + 6);
      ctx.moveTo(slam.x + 6, slam.y - 6);
      ctx.lineTo(slam.x - 6, slam.y + 6);
      ctx.strokeStyle = '#ffd5ab';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (game.swing && !game.swing.hit) {
      const s = stats(game),
        progress = game.swing.age / .18;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(game.swing.angle);
      ctx.strokeStyle = game.ranks.dawn ? '#ffe6a680' : '#dfba7350';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s.swordRange * (.82 + progress * .18), -s.swordHalfAngle, s.swordHalfAngle);
      ctx.stroke();
      ctx.restore();
    }
    const actors = [...game.enemies.map(e => ({
      ...e,
      actor: 'enemy'
    })), {
      ...p,
      actor: 'player'
    }].sort((a, b) => a.y - b.y);
    for (const a of actors) {
      if (Math.abs(a.x - p.x) > viewW / 2 + 120 || Math.abs(a.y - p.y) > viewH / 2 + 150) continue;
      if (a.actor === 'enemy') {
        shadow(a.x, a.y + 2, a.radius * 1.15, a.radius * .43);
        if (a.boss) {
          const pattern = a.pattern,
            row = pattern ? 1 : 0;
          const frame = pattern ? pattern.age < BOSS.windup * .5 ? 0 : pattern.age < BOSS.windup ? 1 : pattern.age < BOSS.windup + .45 ? 2 : 3 : Math.floor(game.time * 4) % 4;
          ctx.strokeStyle = a.enraged ? '#ed8979' : '#e9bd78aa';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(a.x, a.y, a.radius + 9, 19, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = a.entrance > 0 ? .45 + .55 * (1 - a.entrance / BOSS.entrance) : 1;
          sprite(art.boss, frame, row, 2, a.x, a.y, a.size, pattern ? Math.cos(pattern.angle) < 0 : a.x > p.x, a.hit > 0, false, {
            anchor: row ? .94 : .95,
            edges: row ? [0, 443.5, 887, 1364, 1774] : undefined
          });
          ctx.globalAlpha = 1;
          continue;
        }
        const near = Math.hypot(a.x - p.x, a.y - p.y) < a.radius + 53;
        if (a.elite || near) {
          ctx.strokeStyle = a.elite ? '#f3b66eaa' : '#ec987888';
          ctx.lineWidth = a.elite ? 2 : 1.5;
          ctx.setLineDash(a.elite ? [] : [4, 5]);
          ctx.beginPath();
          ctx.ellipse(a.x, a.y + 1, a.radius + 5, (a.radius + 5) * .6, 0, 0, 7);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        const frame = a.slam ? a.slam.hit ? 2 : 0 : game.phase === 'ready' ? 0 : Math.floor(game.time * (a.type === 1 ? 9 : 5) + a.id) % 4;
        const slamPose = a.slam && !reduced.matches ? a.slam.hit ? {
          sx: 1.1,
          sy: .9
        } : {
          sy: 1.07,
          tilt: -.08
        } : {};
        sprite(art.enemies, frame, a.type, 3, a.x, a.y, a.size, a.x > p.x, a.hit > 0, false, slamPose);
        if (a.elite || a.hp < a.maxHp * .9) {
          const bar = a.elite ? 46 : 25;
          ctx.fillStyle = '#16221bdd';
          ctx.fillRect(a.x - bar / 2, a.y - a.size * .69, bar, 3);
          ctx.fillStyle = a.elite ? '#e3ac61' : '#d9a487';
          ctx.fillRect(a.x - bar / 2, a.y - a.size * .69, bar * Math.max(0, a.hp / a.maxHp), 3);
        }
        if (a.elite) {
          ctx.font = 'bold 9px system-ui';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffd994';
          ctx.fillText('정예', a.x, a.y - a.size * .69 - 7);
        }
      } else {
        shadow(p.x, p.y, 20, 7);
        ctx.strokeStyle = '#b7e5c887';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 1, 19, 8, 0, 0, 7);
        ctx.stroke();
        let row = 0,
          frame = p.moving ? Math.floor(p.walk * 7) % 4 : 0;
        if (p.cast > 0) {
          row = 1;
          frame = p.cast > .3 ? 0 : p.cast > .2 ? 1 : p.cast > .1 ? 2 : 3;
        }
        if (game.swing) {
          row = 1;
          const age = game.swing.age;
          frame = age < .18 ? 0 : age < .26 ? 1 : age < .4 ? 2 : 3;
        }
        let pose = {};
        if (game.swing && !reduced.matches) {
          const age = game.swing.age;
          if (age < .18) {
            const t = age / .18;
            pose = {
              x: -p.facing * 3 * t,
              tilt: -.09 * t,
              sx: 1 + .03 * t,
              sy: 1 - .03 * t
            };
          } else {
            const t = Math.max(0, 1 - (age - .18) / .37);
            pose = {
              x: Math.cos(game.swing.angle) * 7 * t,
              y: Math.sin(game.swing.angle) * 5 * t,
              tilt: .1 * t
            };
          }
        }
        if (p.hurt > 0) {
          row = 2;
          frame = p.hurt > .12 ? 1 : 0;
          pose = {};
        }
        if (game.outcome === 'defeat') {
          row = 2;
          frame = (p.deathAge ?? 0) < .3 ? 2 : 3;
          pose = {};
        }
        const atlas = game.characterId === 'ash' ? {
          rows: [0, 440, 835, 1254],
          edges: row === 1 ? [0, 307, 634, 962, 1254] : undefined,
          anchor: row === 0 ? .968 : row === 1 ? .912 : .81
        } : game.characterId === 'ember' ? {
          rows: [0, 440, 835, 1254],
          edges: row === 1 ? [0, 313, 627, 964, 1254] : undefined,
          anchor: row === 0 ? .95 : row === 1 ? .93 : .88
        } : {
          rows: [0, 480, 860, 1254],
          anchor: row === 0 ? .94 : row === 1 ? .93 : .88
        };
        const blink = !reduced.matches && game.phase !== 'ended' && p.invincible > 0 && Math.floor(game.time * 16) % 2 === 0;
        ctx.globalAlpha = blink ? .5 : 1;
        sprite(art.heroes[game.characterId], frame, row, 3, p.x, p.y, 88, p.facing < 0, p.hurt > 0, false, {
          ...pose,
          ...atlas,
          proportional: true
        });
        ctx.globalAlpha = 1;
      }
    }
    for (const shot of game.shots) {
      if (shot.kind === 'crescent') {
        ctx.save();
        ctx.translate(shot.x, shot.y - 8);
        ctx.rotate(Math.atan2(shot.vy, shot.vx));
        ctx.strokeStyle = '#e8b45755';
        ctx.lineWidth = 13;
        ctx.beginPath();
        ctx.arc(-10, 0, 27, -1.35, 1.35);
        ctx.stroke();
        ctx.strokeStyle = '#fff0ba';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
        continue;
      }
      ctx.strokeStyle = shot.blast ? '#ff9b5677' : '#ffb45e88';
      ctx.lineWidth = shot.blast ? 9 : 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shot.x - shot.vx * (shot.blast ? .085 : .045), shot.y - shot.vy * (shot.blast ? .085 : .045) - 14);
      ctx.lineTo(shot.x, shot.y - 14);
      ctx.stroke();
      ctx.fillStyle = shot.blast ? '#fff1b9' : '#ffda8f';
      ctx.beginPath();
      ctx.arc(shot.x, shot.y - 14, shot.blast ? 6 : 4.5, 0, 7);
      ctx.fill();
    }
    for (const orb of orbitPositions(game)) {
      ctx.save();
      ctx.translate(orb.x, orb.y - 12);
      ctx.rotate(game.time * 2);
      ctx.fillStyle = '#a9eed7';
      ctx.strokeStyle = '#437b6d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 10);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    for (const e of game.effects) {
      const progress = e.age / e.life;
      ctx.globalAlpha = 1 - progress;
      if (e.kind === 'slash') {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle);
        ctx.strokeStyle = e.evolved ? '#fff0bb' : '#ffe0a7';
        ctx.lineWidth = (e.evolved ? 11 : 7) * (1 - progress) + 1;
        ctx.beginPath();
        ctx.arc(0, 0, e.range * (.88 + progress * .12), -e.halfAngle, e.halfAngle);
        ctx.stroke();
        ctx.strokeStyle = '#eba45966';
        ctx.lineWidth = 18 * (1 - progress);
        ctx.stroke();
        ctx.restore();
      } else if (e.kind === 'slam') {
        ctx.fillStyle = '#d5834230';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.range, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffbc79';
        ctx.lineWidth = 5 * (1 - progress) + 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.range * (.5 + progress * .5), 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(e.x + Math.cos(a) * 25, e.y + Math.sin(a) * 25);
          ctx.lineTo(e.x + Math.cos(a) * e.range * .9, e.y + Math.sin(a) * e.range * .9);
          ctx.stroke();
        }
      } else if (e.kind === 'boss-cast') {
        ctx.strokeStyle = '#edaa82';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 25 + progress * 40, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.kind === 'ember-burst') {
        ctx.fillStyle = '#e9934938';
        ctx.strokeStyle = '#ffdb9a';
        ctx.lineWidth = 4 * (1 - progress) + 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.range * (.6 + progress * .4), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        for (let i = 0; i < 7; i++) {
          const a = i * Math.PI * 2 / 7;
          ctx.fillStyle = '#ffc280';
          ctx.fillRect(e.x + Math.cos(a) * progress * e.range, e.y + Math.sin(a) * progress * e.range, 4, 4);
        }
      } else if (e.kind === 'lunar-pulse') {
        ctx.strokeStyle = '#b8f6df';
        ctx.lineWidth = 5 * (1 - progress) + 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.range * (.6 + progress * .4), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([6, 12]);
        ctx.strokeStyle = '#84cbb899';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.range * (.5 + progress * .5) - 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (e.kind === 'damage') {
        ctx.font = 'bold 13px system-ui';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#182219';
        ctx.lineWidth = 3;
        ctx.strokeText(e.text, e.x, e.y - progress * 22);
        ctx.fillStyle = e.tone;
        ctx.fillText(e.text, e.x, e.y - progress * 22);
      } else if (e.kind === 'pop') {
        for (let i = 0; i < 5; i++) {
          const a = i * Math.PI * 2 / 5;
          ctx.fillStyle = e.tone;
          ctx.fillRect(e.x + Math.cos(a) * progress * 25, e.y - 10 + Math.sin(a) * progress * 25, 3 * (1 - progress) + 1, 3 * (1 - progress) + 1);
        }
      } else if (e.kind === 'hurt') {
        ctx.strokeStyle = '#f39077';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y - 12, 24 + progress * 25, 0, 7);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    // Enemy projectiles stay above decorative player effects and have an arrowhead silhouette.
    for (const thorn of game.thorns) {
      ctx.save();
      ctx.translate(thorn.x, thorn.y);
      ctx.rotate(Math.atan2(thorn.vy, thorn.vx));
      ctx.strokeStyle = '#28181e';
      ctx.lineWidth = 4;
      ctx.fillStyle = '#ff9e82';
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.lineTo(-7, -7);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-7, 7);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      ctx.strokeStyle = '#ffead0';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
    const boss = game.enemies.find(e => e.boss);
    if (boss && (Math.abs(boss.x - p.x) > viewW / 2 - 70 || Math.abs(boss.y - p.y) > viewH / 2 - 90)) {
      const dx = boss.x - p.x,
        dy = boss.y - p.y,
        t = Math.min((viewW / 2 - 45) / Math.max(1, Math.abs(dx)), (viewH / 2 - 95) / Math.max(1, Math.abs(dy)));
      ctx.save();
      ctx.translate(p.x + dx * t, p.y + dy * t);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.fillStyle = '#ffcd92';
      ctx.strokeStyle = '#291d1e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, -8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      ctx.restore();
    }
    const recovery = nearestRecovery(game);
    if (recovery && p.hp / p.maxHp < .6 && (Math.abs(recovery.x - p.x) > viewW / 2 - 60 || Math.abs(recovery.y - p.y) > viewH / 2 - 100)) {
      const dx = recovery.x - p.x,
        dy = recovery.y - p.y,
        t = Math.min((viewW / 2 - 40) / Math.max(1, Math.abs(dx)), (viewH / 2 - 105) / Math.max(1, Math.abs(dy)));
      const x = p.x + dx * t,
        y = p.y + dy * t;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.fillStyle = '#ffe1a8';
      ctx.strokeStyle = '#263729';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.lineTo(-7, -7);
      ctx.lineTo(-7, 7);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffe1a8';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('회복', x, y + 21);
    }
    if (game.recoveryFlash) {
      const flash = game.recoveryFlash,
        progress = flash.age / .8;
      ctx.globalAlpha = 1 - progress;
      ctx.strokeStyle = '#c2e6a6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 24 + progress * 18, 12 + progress * 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = 'bold 15px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#d9f4be';
      ctx.fillText(`+${Math.round(flash.amount)}`, p.x, p.y - 92 - progress * 20);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.drawImage(vignette, 0, 0, width, height);
    if (p.hp / p.maxHp < .3 && game.phase === 'playing') {
      ctx.strokeStyle = '#d56e5860';
      ctx.lineWidth = 8;
      ctx.strokeRect(0, 0, width, height);
    }
    return {
      scale,
      width,
      height
    };
  }
  resize();
  return {
    render,
    resize
  };
}
