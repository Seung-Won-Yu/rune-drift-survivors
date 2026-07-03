import {
  EARLY_FIELD_ITEM_SCHEDULE,
  FIELD_ITEM_META
} from '../config/gameData.js';
import {
  ARMORY_DOUBLE_BOOST_TIME,
  ARMORY_TRIPLE_BOOST_TIME,
  FIELD_ITEM_ATTRACT_RADIUS,
  FIELD_ITEM_PICKUP_RADIUS,
  MAX_FIELD_ITEMS,
  OVERLOAD_DURATION
} from '../config/gameTuning.js';
import {
  createFieldItem,
  getFieldItemDropPosition,
  pickFieldItemType
} from './fieldItemDirector.js';
import { withItemPickup } from './gameState.js';
import {
  applyBuildFocus,
  getFocusMessage,
  getUpgradeFocusKey
} from './progression.js';
import { pickArmoryBoost } from './upgradeDrafting.js';

export function updateFieldItemsRuntime(context) {
  const {
    dt,
    currentGame,
    updateGame,
    player,
    fieldItems,
    fieldItemTimer,
    fieldItemDropLock,
    scheduledFieldItems,
    spawnWarnings,
    scratch
  } = context;
  fieldItemTimer.current -= dt;
  fieldItemDropLock.current = Math.max(0, fieldItemDropLock.current - dt);

  for (const scheduled of EARLY_FIELD_ITEM_SCHEDULE) {
    if (currentGame.time < scheduled.time || scheduledFieldItems.current.has(scheduled.id)) continue;
    const item = createFieldItem(
      scheduled.type,
      getFieldItemDropPosition(player.current.pos, scheduled.distance, scheduled.spread ?? 4)
    );
    const meta = FIELD_ITEM_META[scheduled.type];
    fieldItems.current.push(item);
    spawnWarnings.current.push({
      pos: item.pos.clone(),
      life: 1.05,
      maxLife: 1.05,
      color: meta.color,
      label: meta.label
    });
    scheduledFieldItems.current.add(scheduled.id);
    fieldItemTimer.current = Math.max(fieldItemTimer.current, 3.8);
  }

  if (fieldItemTimer.current <= 0 && fieldItems.current.length < MAX_FIELD_ITEMS) {
    const type = pickFieldItemType(currentGame);
    const meta = FIELD_ITEM_META[type];
    const item = createFieldItem(type, getFieldItemDropPosition(player.current.pos));
    fieldItems.current.push(item);
    spawnWarnings.current.push({
      pos: item.pos.clone(),
      life: 0.9,
      maxLife: 0.9,
      color: meta.color,
      label: meta.label
    });
    fieldItemTimer.current = currentGame.time < 125
      ? 5.4 + Math.random() * 3.2
      : Math.max(4.8, 11.5 - currentGame.wave * 0.26 + Math.random() * 3.6);
  }

  let itemWrite = 0;
  for (const item of fieldItems.current) {
    item.pulse += dt * 4.2;
    item.life -= dt;
    if (item.life <= 0) continue;
    const distanceSq = item.pos.distanceToSquared(player.current.pos);
    if (distanceSq < FIELD_ITEM_ATTRACT_RADIUS * FIELD_ITEM_ATTRACT_RADIUS && distanceSq > 0.000001) {
      const distance = Math.sqrt(distanceSq);
      const pull = scratch.vec.copy(player.current.pos).sub(item.pos).setY(0).normalize();
      item.pos.addScaledVector(pull, dt * (6.2 + (FIELD_ITEM_ATTRACT_RADIUS - distance) * 1.35));
    }
    if (distanceSq <= FIELD_ITEM_PICKUP_RADIUS * FIELD_ITEM_PICKUP_RADIUS) {
      applyFieldItemRuntime(item, currentGame, updateGame, context);
      continue;
    }
    fieldItems.current[itemWrite] = item;
    itemWrite += 1;
  }
  fieldItems.current.length = itemWrite;
}

function applyFieldItemRuntime(item, currentGame, updateGame, context) {
  const {
    player,
    xpGems,
    enemies,
    hitBursts,
    weaponEffects,
    cameraShake,
    orbTimer,
    stormTimer,
    lightningTimer,
    novaTimer,
    addDamageNumber
  } = context;

  if (item.type === 'magnet') {
    xpGems.current.forEach(gem => {
      gem.magnetized = true;
    });
    hitBursts.current.push({
      pos: player.current.pos.clone(),
      life: 0.9,
      maxLife: 0.9,
      color: '#58b9d4',
      type: 'magnet',
      stage: 4,
      radius: 4.8
    });
    addDamageNumber(player.current.pos, `자석 ${xpGems.current.length}`, '#7fc9d8', 0.9);
    cameraShake.current = Math.max(cameraShake.current, 0.18);
    updateGame(current => ({
      ...withItemPickup(current, 'magnet'),
      pickupMessage: '자석 룬: XP 흡수',
      pickupFlash: 2.4
    }));
    return;
  }

  if (item.type === 'heal') {
    const healAmount = 34;
    hitBursts.current.push({
      pos: player.current.pos.clone(),
      life: 0.78,
      maxLife: 0.78,
      color: FIELD_ITEM_META.heal.color,
      type: 'heal',
      stage: 3,
      radius: 4.2
    });
    addDamageNumber(player.current.pos, `회복 +${healAmount}`, FIELD_ITEM_META.heal.color, 0.9);
    cameraShake.current = Math.max(cameraShake.current, 0.12);
    updateGame(current => ({
      ...withItemPickup(current, 'heal'),
      pickupMessage: '생명 결정: 체력 회복',
      pickupFlash: 2.4,
      stats: {
        ...current.stats,
        hp: Math.min(current.stats.maxHp, current.stats.hp + healAmount)
      }
    }));
    return;
  }

  if (item.type === 'overload') {
    const color = FIELD_ITEM_META.overload.color;
    hitBursts.current.push({
      pos: player.current.pos.clone(),
      life: 1.0,
      maxLife: 1.0,
      color,
      type: 'overload',
      stage: 5,
      radius: 6.5
    });
    weaponEffects.current.push({
      type: 'ring',
      pos: player.current.pos.clone(),
      life: 0.7,
      maxLife: 0.7,
      color,
      radius: 11
    });
    addDamageNumber(player.current.pos, '과부하 8초', color, 0.98);
    cameraShake.current = Math.max(cameraShake.current, 0.22);
    updateGame(current => ({
      ...withItemPickup(current, 'overload'),
      overloadTimer: OVERLOAD_DURATION,
      pickupMessage: '과부하 룬: 무기 폭주',
      pickupFlash: 2.4
    }));
    return;
  }

  if (item.type === 'cache') {
    const color = FIELD_ITEM_META.cache.color;
    hitBursts.current.push({
      pos: player.current.pos.clone(),
      life: 0.92,
      maxLife: 0.92,
      color,
      type: 'cache',
      stage: 5,
      radius: 5.2
    });
    weaponEffects.current.push({
      type: 'ring',
      pos: player.current.pos.clone(),
      life: 0.62,
      maxLife: 0.62,
      color,
      radius: 8.5
    });
    cameraShake.current = Math.max(cameraShake.current, 0.18);
    updateGame(current => {
      let nextGame = withItemPickup(current, 'cache');
      const boosts = [];
      const excluded = new Set();
      const boostCount = current.time < ARMORY_DOUBLE_BOOST_TIME ? 1 : current.time > ARMORY_TRIPLE_BOOST_TIME ? 3 : 2;
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
      const focusKey = getUpgradeFocusKey(boosts[boosts.length - 1]);
      const focusMessage = getFocusMessage(focusKey, nextGame.buildFocus);
      const boostNames = boosts.map(boost => boost.title).join(' + ');
      return {
        ...nextGame,
        pickupMessage: focusMessage ? `무기 보급: ${focusMessage}` : `무기 보급: ${boostNames}`,
        pickupFlash: 2.8
      };
    });
    addDamageNumber(player.current.pos, currentGame.time < ARMORY_DOUBLE_BOOST_TIME ? '무기 강화 x1' : currentGame.time > ARMORY_TRIPLE_BOOST_TIME ? '무기 강화 x3' : '무기 강화 x2', color, 1.0);
    orbTimer.current = Math.min(orbTimer.current, 0.04);
    stormTimer.current = Math.min(stormTimer.current, 0.08);
    lightningTimer.current = Math.min(lightningTimer.current, 0.06);
    novaTimer.current = Math.min(novaTimer.current, currentGame.time < 35 ? 0.55 : 0.12);
    return;
  }

  let cleared = 0;
  const clearRadius = 58;
  for (const enemy of enemies.current) {
    if (enemy.pos.distanceToSquared(player.current.pos) > clearRadius * clearRadius) continue;
    enemy.hp = 0;
    enemy.flash = 0.18;
    cleared += 1;
    if (cleared <= 30) {
      hitBursts.current.push({
        pos: enemy.pos.clone(),
        life: 0.46,
        maxLife: 0.46,
        color: '#d4a84c',
        type: 'purge',
        stage: 5,
        radius: enemy.hitRadius + 0.8
      });
    }
  }
  hitBursts.current.push({
    pos: player.current.pos.clone(),
    life: 1.1,
    maxLife: 1.1,
    color: '#d4a84c',
    type: 'purge',
    stage: 5,
    radius: 7.2
  });
  addDamageNumber(player.current.pos, `정화 ${cleared}`, '#d4a84c', 0.96);
  cameraShake.current = Math.max(cameraShake.current, 0.36);
  updateGame(current => ({
    ...withItemPickup(current, 'purge'),
    pickupMessage: '정화 폭발: 근처 적 소멸',
    pickupFlash: 2.4
  }));
}
