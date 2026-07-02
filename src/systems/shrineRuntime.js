import {
  ARMORY_DOUBLE_BOOST_TIME,
  SHRINE_ACTIVATE_RADIUS,
  SHRINE_CHANNEL_TIME
} from '../config/gameTuning.js';
import {
  withItemPickup,
  withShrineActivation
} from './gameState.js';
import {
  applyBuildFocus,
  getUpgradeFocusKey
} from './progression.js';
import { pickArmoryBoost } from './upgradeDrafting.js';

export function updateShrinesRuntime(context) {
  const {
    dt,
    currentGame,
    updateGame,
    player,
    shrines,
    spawnWarnings,
    addDamageNumber
  } = context;

  for (const shrine of shrines.current) {
    if (shrine.activated) continue;
    shrine.pulse += dt * 2.6;
    const distanceSq = shrine.pos.distanceToSquared(player.current.pos);
    if (distanceSq < SHRINE_ACTIVATE_RADIUS * SHRINE_ACTIVATE_RADIUS) {
      shrine.channel = Math.min(SHRINE_CHANNEL_TIME, shrine.channel + dt);
      if (!shrine.prompted) {
        shrine.prompted = true;
        spawnWarnings.current.push({
          pos: shrine.pos.clone(),
          life: 1.0,
          maxLife: 1.0,
          color: shrine.color,
          label: 'SHRINE'
        });
        addDamageNumber(shrine.pos, shrine.label, shrine.color, 0.72);
      }
    } else {
      shrine.channel = Math.max(0, shrine.channel - dt * 0.72);
    }

    if (shrine.channel < SHRINE_CHANNEL_TIME) continue;
    shrine.activated = true;
    shrine.channel = SHRINE_CHANNEL_TIME;
    activateShrineRuntime(shrine, currentGame, updateGame, context);
  }
}

function activateShrineRuntime(shrine, currentGame, updateGame, context) {
  const {
    enemies,
    hitBursts,
    weaponEffects,
    cameraShake,
    addDamageNumber
  } = context;

  hitBursts.current.push({
    pos: shrine.pos.clone(),
    life: 1.0,
    maxLife: 1.0,
    color: shrine.color,
    type: 'shrine',
    stage: 5,
    radius: 7.4
  });
  weaponEffects.current.push({
    type: 'ring',
    pos: shrine.pos.clone(),
    life: 0.82,
    maxLife: 0.82,
    color: shrine.color,
    radius: 13.5
  });
  cameraShake.current = Math.max(cameraShake.current, 0.2);

  if (shrine.reward === 'cache') {
    updateGame(current => {
      let nextGame = withShrineActivation(withItemPickup(current, 'cache'), shrine.id);
      const boosts = [];
      const excluded = new Set();
      const boostCount = current.time < ARMORY_DOUBLE_BOOST_TIME ? 1 : 2;
      for (let index = 0; index < boostCount; index += 1) {
        const boost = pickArmoryBoost(nextGame, excluded);
        if (!boost) break;
        excluded.add(boost.id);
        const focusKey = getUpgradeFocusKey(boost);
        nextGame = {
          ...nextGame,
          stats: boost.apply(nextGame.stats),
          buildFocus: applyBuildFocus(nextGame.buildFocus, focusKey),
          upgrades: [...nextGame.upgrades, boost.id]
        };
        boosts.push(boost);
      }
      return {
        ...nextGame,
        pickupMessage: `무기 제단: ${boosts.map(boost => boost.title).join(' + ')}`,
        pickupFlash: 2.8
      };
    });
    addDamageNumber(shrine.pos, currentGame.time < 160 ? '무기 각인 x1' : '무기 각인 x2', shrine.color, 0.98);
    return;
  }

  if (shrine.reward === 'heal') {
    updateGame(current => ({
      ...withShrineActivation(withItemPickup(current, 'heal'), shrine.id),
      pickupMessage: '생명 제단: 최대 체력 회복',
      pickupFlash: 2.6,
      stats: {
        ...current.stats,
        hp: current.stats.maxHp
      }
    }));
    addDamageNumber(shrine.pos, '완전 회복', shrine.color, 0.98);
    return;
  }

  if (shrine.reward === 'upgrade') {
    updateGame(current => ({
      ...withShrineActivation(current, shrine.id),
      pendingUpgrades: (current.pendingUpgrades ?? 0) + 1,
      pickupMessage: '각인 제단: 보상 선택 +1',
      pickupFlash: 2.8
    }));
    addDamageNumber(shrine.pos, '보상 선택 +1', shrine.color, 0.98);
    return;
  }

  let cleared = 0;
  const clearRadius = 48;
  for (const enemy of enemies.current) {
    if (enemy.pos.distanceToSquared(shrine.pos) > clearRadius * clearRadius) continue;
    enemy.hp = 0;
    enemy.flash = 0.18;
    cleared += 1;
    if (cleared <= 34) {
      hitBursts.current.push({
        pos: enemy.pos.clone(),
        life: 0.42,
        maxLife: 0.42,
        color: shrine.color,
        type: 'purge',
        stage: 5,
        radius: enemy.hitRadius + 0.8
      });
    }
  }
  updateGame(current => ({
    ...withShrineActivation(withItemPickup(current, 'purge'), shrine.id),
    pickupMessage: `정화 제단: ${cleared} 소멸`,
    pickupFlash: 2.6
  }));
  addDamageNumber(shrine.pos, `정화 ${cleared}`, shrine.color, 0.98);
}
