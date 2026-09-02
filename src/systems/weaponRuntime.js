import * as THREE from 'three';
import { AUDIO_CUE, emitAudioCue } from '../audio/audioCues.js';
import { WEAPON_CATALOG as weaponCatalog } from '../config/gameData.js';
import { applyDamageToEnemy } from './enemyDirector.js';
import {
  getBuildFocus,
  getLightningColor,
  getNovaColor,
  getOrbColor,
  getStormColor,
  getSynergyLevel,
  getWeaponStage,
  getWeaponTier,
  isWeaponFamilyUnlocked
} from './progression.js';
import { getCircuitFinaleState } from './runeCircuit.js';

const UP_AXIS = new THREE.Vector3(0, 1, 0);
const orbDirection = new THREE.Vector3();
const knockbackDirection = new THREE.Vector3();

export function updateWeaponCasts({
  dt,
  currentGame,
  player,
  enemies,
  orbTimer,
  stormTimer,
  lightningTimer,
  novaTimer,
  hitBursts,
  weaponEffects,
  cameraShake,
  addProjectile,
  nearestEnemies,
  pulsePlayerCast,
  recordDamage,
  addDamageNumber,
  canAddHitBurst,
  canAddWeaponEffect
}) {
  const stats = currentGame.stats;
  const weaponStage = getWeaponStage(currentGame);
  const overloadDamage = currentGame.overloadTimer > 0 ? 1.25 : 1;
  const overloadCooldown = currentGame.overloadTimer > 0 ? 0.58 : 1;
  const circuitFinale = getCircuitFinaleState(currentGame);
  const orbFocus = getBuildFocus(currentGame, 'orb');
  const stormFocus = getBuildFocus(currentGame, 'storm');
  const chainFocus = getBuildFocus(currentGame, 'chain');
  const novaFocus = getBuildFocus(currentGame, 'nova');
  const stormUnlocked = isWeaponFamilyUnlocked(currentGame, 'storm');
  const chainUnlocked = isWeaponFamilyUnlocked(currentGame, 'chain');
  const novaUnlocked = isWeaponFamilyUnlocked(currentGame, 'nova');
  const stormChainLevel = getSynergyLevel(currentGame, 'storm-chain');
  const bladeNovaLevel = getSynergyLevel(currentGame, 'blade-nova');
  const orbPierceLevel = getSynergyLevel(currentGame, 'orb-pierce');

  orbTimer.current -= dt;
  stormTimer.current -= dt;
  lightningTimer.current -= dt;
  novaTimer.current -= dt;

  if (orbTimer.current <= 0) {
    const orbCount = Math.min(12, stats.orbCount + Math.floor(orbFocus / 2));
    const targets = nearestEnemies(orbCount, 42 + (stats.orbSpeed - 1) * 24 + orbFocus * 4);
    if (targets.length > 0) {
      emitAudioCue(AUDIO_CUE.weaponCast, { variant: 'orb', intensity: Math.min(1, 0.55 + targets.length * 0.05) });
      pulsePlayerCast(0.16 + weaponStage * 0.012);
      const tier = getWeaponTier(stats, weaponStage);
      const shotTotal = orbFocus >= 2 ? Math.max(orbCount, targets.length) : targets.length;
      for (let index = 0; index < shotTotal; index += 1) {
        const target = targets[index % targets.length];
        const dir = orbDirection.copy(target.pos).sub(player.current.pos).setY(0).normalize();
        const spread = (index - (shotTotal - 1) / 2) * (orbFocus >= 2 ? 0.14 : 0.09);
        dir.applyAxisAngle(UP_AXIS, spread);
        const speed = weaponCatalog[0].speed * stats.orbSpeed * (1 + orbPierceLevel * 0.06);
        addProjectile({
          type: 'orb',
          pos: new THREE.Vector3(player.current.pos.x, player.current.pos.y + 0.35, player.current.pos.z),
          vel: new THREE.Vector3(dir.x * speed, 0, dir.z * speed),
          angle: Math.atan2(dir.x, dir.z),
          life: 1.25 + stats.pierce * 0.05,
          damage: weaponCatalog[0].damage * stats.damage * stats.orbDamage * overloadDamage * circuitFinale.damageMultiplier * (1 + orbFocus * 0.035 + orbPierceLevel * 0.05),
          pierce: weaponCatalog[0].pierce + stats.pierce + (orbFocus >= 3 ? 1 : 0) + Math.floor(orbPierceLevel / 2),
          radius: weaponCatalog[0].size * stats.orbScale * (tier + weaponStage * 0.1),
          visualScale: stats.orbScale * (tier + weaponStage * 0.2),
          stage: weaponStage,
          trailLength: 1.05 + tier * 0.18 + weaponStage * 0.35 + orbFocus * 0.08,
          color: getOrbColor(stats, weaponStage)
        });
      }
    }
    orbTimer.current = Math.max(0.16, weaponCatalog[0].cooldown * stats.cooldown * overloadCooldown * circuitFinale.cooldownMultiplier * (1 - weaponStage * 0.04) * (1 - Math.min(0.12, orbFocus * 0.02)));
  }

  if (stormUnlocked && stormTimer.current <= 0 && enemies.current.length > 3) {
    emitAudioCue(AUDIO_CUE.weaponCast, { variant: 'storm', intensity: 0.8 });
    pulsePlayerCast(0.22 + stormFocus * 0.012);
    const tier = getWeaponTier(stats, weaponStage);
    const strikeCount = Math.min(7, Math.max(1, Math.round(stats.stormStrikes) + Math.floor(stormFocus / 2)));
    for (let strike = 0; strike < strikeCount; strike += 1) {
      const target = enemies.current[Math.floor(Math.random() * enemies.current.length)];
      if (!target) continue;
      const spread = strike === 0 ? 0 : 5.5 + stormFocus * 0.9;
      const offsetX = strike === 0 ? 0 : (Math.random() - 0.5) * spread;
      const offsetZ = strike === 0 ? 0 : (Math.random() - 0.5) * spread;
      const strikePos = new THREE.Vector3(target.pos.x + offsetX, target.pos.y + 0.8, target.pos.z + offsetZ);
      addProjectile({
        type: 'storm',
        pos: strikePos,
        vel: new THREE.Vector3(),
        angle: Math.random() * Math.PI * 2,
        life: 0.34 * stats.stormDuration * (1 + stormFocus * 0.06),
        damage: weaponCatalog[1].damage * stats.damage * stats.stormDamage * overloadDamage * circuitFinale.damageMultiplier * (1 + stormFocus * 0.03 + stormChainLevel * 0.035),
        pierce: weaponCatalog[1].pierce,
        radius: 1.55 * (tier + weaponStage * 0.08) * stats.stormRadius * (1 + stormFocus * 0.035),
        visualScale: tier + weaponStage * 0.18,
        stage: weaponStage,
        burstRadius: (1.7 + tier * 0.36 + weaponStage * 0.42 + stormFocus * 0.18) * stats.stormRadius,
        color: getStormColor(stats, weaponStage)
      });
      if (canAddHitBurst(8)) {
        hitBursts.current.push({
          pos: strikePos.clone(),
          life: (0.5 + weaponStage * 0.05) * Math.min(1.9, stats.stormDuration + stormFocus * 0.08),
          maxLife: (0.5 + weaponStage * 0.05) * Math.min(1.9, stats.stormDuration + stormFocus * 0.08),
          color: getStormColor(stats, weaponStage),
          type: 'storm',
          stage: weaponStage,
          radius: 1.35 + tier * 0.24 + stormFocus * 0.12
        });
      }
    }
    stormTimer.current = Math.max(0.38, weaponCatalog[1].cooldown * stats.cooldown * stats.stormCooldown * overloadCooldown * circuitFinale.cooldownMultiplier * (1 - weaponStage * 0.06) * (1 - Math.min(0.14, stormFocus * 0.025 + stormChainLevel * 0.018)));
  }

  if (chainUnlocked && lightningTimer.current <= 0 && enemies.current.length > 0) {
    pulsePlayerCast(0.18 + chainFocus * 0.01);
    const chainTargets = nearestEnemies(
      stats.lightningChains + Math.floor(weaponStage / 2) + Math.floor(chainFocus / 2),
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
      const damage = weaponCatalog[3].damage * stats.damage * stats.lightningDamage * overloadDamage * circuitFinale.damageMultiplier * executeBoost * (1 - index * 0.08) * (1 + chainFocus * 0.035 + stormChainLevel * 0.035);
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
    lightningTimer.current = Math.max(0.3, weaponCatalog[3].cooldown * stats.cooldown * overloadCooldown * circuitFinale.cooldownMultiplier * (1 - weaponStage * 0.05) * (1 - Math.min(0.12, chainFocus * 0.02)));
  }

  if (novaUnlocked && novaTimer.current <= 0 && enemies.current.length > 0) {
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
    if (hitCount > 0) cameraShake.current = Math.max(cameraShake.current, 0.16);
    if (hitCount > 0) {
      emitAudioCue(AUDIO_CUE.weaponCast, { variant: 'nova', intensity: Math.min(1, 0.62 + hitCount * 0.025) });
    }
    novaTimer.current = Math.max(0.58, weaponCatalog[4].cooldown * stats.cooldown * stats.novaCooldown * overloadCooldown * circuitFinale.cooldownMultiplier * (1 - weaponStage * 0.05) * (1 - Math.min(0.16, novaFocus * 0.028 + bladeNovaLevel * 0.014)));
  }
}
