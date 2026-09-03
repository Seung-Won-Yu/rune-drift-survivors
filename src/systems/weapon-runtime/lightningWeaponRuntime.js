import * as THREE from 'three';

import { AUDIO_CUE, emitAudioCue } from '../../audio/audioCues.js';
import { WEAPON_CATALOG as weaponCatalog } from '../../config/gameData.js';
import { applyDamageToEnemy } from '../enemyDirector.js';
import { getLightningColor } from '../progression.js';

const knockbackDirection = new THREE.Vector3();

export function updateLightningWeapon(context, common, chainFocus, stormChainLevel, unlocked) {
  const {
    player,
    enemies,
    lightningTimer,
    hitBursts,
    weaponEffects,
    cameraShake,
    nearestEnemies,
    pulsePlayerCast,
    recordDamage,
    addDamageNumber,
    canAddHitBurst,
    canAddWeaponEffect
  } = context;
  const {
    stats,
    weaponStage,
    overloadDamage,
    overloadCooldown,
    circuitFinale
  } = common;

  if (!unlocked || lightningTimer.current > 0 || enemies.current.length === 0) return;

  pulsePlayerCast(0.18 + chainFocus * 0.01);
  const chainTargets = nearestEnemies(
    getLightningTargetCount(stats, weaponStage, chainFocus),
    weaponCatalog[3].range * stats.lightningRange + weaponStage * 4 + chainFocus * 3 + stormChainLevel * 3.5
  );
  let previousX = player.current.pos.x;
  let previousY = player.current.pos.y + 1.05;
  let previousZ = player.current.pos.z;
  const color = getLightningColor(stats, weaponStage);
  if (chainTargets.length > 0) {
    emitAudioCue(AUDIO_CUE.weaponCast, { variant: 'lightning', intensity: 0.72 });
  }
  chainTargets.forEach((enemy, index) => {
    const executeBoost = stats.lightningExecute > 0 && enemy.hp / enemy.maxHp < 0.45
      ? 1 + stats.lightningExecute * 0.34
      : 1;
    const damage = weaponCatalog[3].damage * stats.damage * stats.lightningDamage * overloadDamage * circuitFinale.damageMultiplier * executeBoost * getLightningDamageFalloff(index) * (1 + chainFocus * 0.035 + stormChainLevel * 0.035);
    const dealt = applyDamageToEnemy(enemy, damage, 'lightning');
    recordDamage('lightning', dealt);
    enemy.flash = 0.2;
    enemy.shocked = Math.max(enemy.shocked ?? 0, 0.48 + chainFocus * 0.16 + stormChainLevel * 0.1);
    knockbackDirection.copy(enemy.pos).sub(player.current.pos).setY(0);
    if (knockbackDirection.lengthSq() > 0.001) enemy.pos.addScaledVector(knockbackDirection.normalize(), 0.08);
    addDamageNumber(enemy.pos, Math.ceil(dealt), color, 0.64);
    if (canAddHitBurst(8)) {
      hitBursts.current.push({
        pos: enemy.pos.clone(),
        life: 0.24,
        maxLife: 0.24,
        color,
        type: 'lightning',
        stage: weaponStage,
        radius: 0.95 + weaponStage * 0.12
      });
    }
    if (canAddWeaponEffect(6)) {
      weaponEffects.current.push({
        type: 'beam',
        from: new THREE.Vector3(previousX, previousY, previousZ),
        to: new THREE.Vector3(enemy.pos.x, enemy.pos.y + 1.0, enemy.pos.z),
        life: 0.18,
        maxLife: 0.18,
        color,
        width: 0.11 + weaponStage * 0.015
      });
    }
    previousX = enemy.pos.x;
    previousY = enemy.pos.y + 1.0;
    previousZ = enemy.pos.z;
  });
  if (chainTargets.length > 0) cameraShake.current = Math.max(cameraShake.current, 0.1);
  lightningTimer.current = Math.max(0.38, weaponCatalog[3].cooldown * stats.cooldown * overloadCooldown * circuitFinale.cooldownMultiplier * (1 - weaponStage * 0.05) * (1 - Math.min(0.12, chainFocus * 0.02)));
}

export function getLightningTargetCount(stats, weaponStage = 0, focus = 0) {
  return Math.min(10, Math.max(1, stats.lightningChains + Math.floor(weaponStage / 2) + Math.floor(focus / 2)));
}

export function getLightningDamageFalloff(index) {
  return Math.max(0.28, 1 - Math.max(0, index) * 0.09);
}
