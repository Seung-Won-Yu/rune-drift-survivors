import * as THREE from 'three';

import { AUDIO_CUE, emitAudioCue } from '../../audio/audioCues.js';
import { WEAPON_CATALOG as weaponCatalog } from '../../config/gameData.js';
import { applyDamageToEnemy } from '../enemyDirector.js';
import { getNovaColor } from '../progression.js';

const knockbackDirection = new THREE.Vector3();

export function updateNovaWeapon(context, common, novaFocus, bladeNovaLevel, unlocked) {
  const {
    player,
    enemies,
    novaTimer,
    hitBursts,
    weaponEffects,
    cameraShake,
    pulsePlayerCast,
    recordDamage,
    addDamageNumber
  } = context;
  const {
    stats,
    weaponStage,
    overloadDamage,
    overloadCooldown,
    circuitFinale
  } = common;

  if (!unlocked || novaTimer.current > 0 || enemies.current.length === 0) return;

  pulsePlayerCast(0.32 + novaFocus * 0.012);
  const color = getNovaColor(stats, weaponStage);
  const radius = weaponCatalog[4].radius * stats.novaRadius * (1 + weaponStage * 0.08 + novaFocus * 0.045 + bladeNovaLevel * 0.04);
  const pulseBoost = 1 + stats.novaPulse * 0.12;
  const damage = weaponCatalog[4].damage * stats.damage * stats.novaDamage * pulseBoost * overloadDamage * circuitFinale.damageMultiplier * (1 + novaFocus * 0.04 + bladeNovaLevel * 0.04);
  let hitCount = 0;
  for (const enemy of enemies.current) {
    const distanceSq = enemy.pos.distanceToSquared(player.current.pos);
    if (distanceSq > radius * radius) continue;
    const falloff = 1 - Math.sqrt(distanceSq) / radius * 0.34;
    const dealt = applyDamageToEnemy(enemy, damage * falloff, 'nova');
    recordDamage('nova', dealt);
    enemy.flash = 0.16;
    const push = knockbackDirection.copy(enemy.pos).sub(player.current.pos).setY(0);
    if (push.lengthSq() > 0.001) enemy.pos.addScaledVector(push.normalize(), 0.34 + novaFocus * 0.05 + bladeNovaLevel * 0.04);
    hitCount += 1;
    if (hitCount <= 18) addDamageNumber(enemy.pos, Math.ceil(dealt), color, 0.56);
  }
  hitBursts.current.push({
    pos: new THREE.Vector3(player.current.pos.x, player.current.pos.y, player.current.pos.z),
    life: 0.62,
    maxLife: 0.62,
    color,
    type: 'nova',
    stage: weaponStage,
    radius
  });
  weaponEffects.current.push({
    type: 'ring',
    pos: new THREE.Vector3(player.current.pos.x, player.current.pos.y, player.current.pos.z),
    life: 0.56,
    maxLife: 0.56,
    color,
    radius,
    signal: 'attack'
  });
  if (stats.novaPulse > 0) {
    weaponEffects.current.push({
      type: 'ring',
      pos: new THREE.Vector3(player.current.pos.x, player.current.pos.y, player.current.pos.z),
      life: 0.78,
      maxLife: 0.78,
      color: '#d4a84c',
      radius: radius * (0.54 + Math.min(0.24, stats.novaPulse * 0.06)),
      signal: 'attack'
    });
  }
  if (novaFocus >= 2) {
    weaponEffects.current.push({
      type: 'ring',
      pos: new THREE.Vector3(player.current.pos.x, player.current.pos.y, player.current.pos.z),
      life: 0.9,
      maxLife: 0.9,
      color: '#d4a84c',
      radius: radius * (0.32 + Math.min(0.18, novaFocus * 0.03)),
      signal: 'attack'
    });
  }
  if (hitCount > 0) {
    cameraShake.current = Math.max(cameraShake.current, 0.16);
    emitAudioCue(AUDIO_CUE.weaponCast, { variant: 'nova', intensity: Math.min(1, 0.62 + hitCount * 0.025) });
  }
  novaTimer.current = Math.max(0.58, weaponCatalog[4].cooldown * stats.cooldown * stats.novaCooldown * overloadCooldown * circuitFinale.cooldownMultiplier * (1 - weaponStage * 0.05) * (1 - Math.min(0.16, novaFocus * 0.028 + bladeNovaLevel * 0.014)));
}
