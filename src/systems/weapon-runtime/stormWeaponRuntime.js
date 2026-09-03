import * as THREE from 'three';

import { AUDIO_CUE, emitAudioCue } from '../../audio/audioCues.js';
import { WEAPON_CATALOG as weaponCatalog } from '../../config/gameData.js';
import { getStormColor, getWeaponTier } from '../progression.js';

export function updateStormWeapon(context, common, stormFocus, stormChainLevel, unlocked) {
  const {
    enemies,
    stormTimer,
    hitBursts,
    addProjectile,
    pulsePlayerCast,
    canAddHitBurst
  } = context;
  const {
    stats,
    weaponStage,
    overloadDamage,
    overloadCooldown,
    circuitFinale
  } = common;

  if (!unlocked || stormTimer.current > 0 || enemies.current.length <= 3) return;

  emitAudioCue(AUDIO_CUE.weaponCast, { variant: 'storm', intensity: 0.8 });
  pulsePlayerCast(0.22 + stormFocus * 0.012);
  const tier = getWeaponTier(stats, weaponStage);
  const strikeCount = getStormStrikeCount(stats, stormFocus);
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
      pierce: Math.min(4, weaponCatalog[1].pierce),
      radius: 1.55 * (tier + weaponStage * 0.08) * stats.stormRadius * (1 + stormFocus * 0.035),
      visualScale: tier + weaponStage * 0.18,
      stage: weaponStage,
      burstRadius: (1.7 + tier * 0.36 + weaponStage * 0.42 + stormFocus * 0.18) * stats.stormRadius,
      color: getStormColor(stats, weaponStage)
    });
    if (canAddHitBurst(8)) {
      const life = (0.5 + weaponStage * 0.05) * Math.min(1.9, stats.stormDuration + stormFocus * 0.08);
      hitBursts.current.push({
        pos: strikePos.clone(),
        life,
        maxLife: life,
        color: getStormColor(stats, weaponStage),
        type: 'storm',
        stage: weaponStage,
        radius: 1.35 + tier * 0.24 + stormFocus * 0.12
      });
    }
  }
  stormTimer.current = Math.max(0.48, weaponCatalog[1].cooldown * stats.cooldown * stats.stormCooldown * overloadCooldown * circuitFinale.cooldownMultiplier * (1 - weaponStage * 0.06) * (1 - Math.min(0.14, stormFocus * 0.025 + stormChainLevel * 0.018)));
}

export function getStormStrikeCount(stats, focus = 0) {
  return Math.min(5, Math.max(1, Math.round(stats.stormStrikes) + Math.floor(focus / 3)));
}
