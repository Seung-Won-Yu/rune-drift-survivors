import * as THREE from 'three';

import { AUDIO_CUE, emitAudioCue } from '../../audio/audioCues.js';
import { WEAPON_CATALOG as weaponCatalog } from '../../config/gameData.js';
import { getOrbColor, getWeaponTier } from '../progression.js';

const UP_AXIS = new THREE.Vector3(0, 1, 0);
const orbDirection = new THREE.Vector3();

export function updateOrbWeapon(context, common, orbFocus, orbPierceLevel) {
  const {
    player,
    orbTimer,
    addProjectile,
    nearestEnemies,
    pulsePlayerCast
  } = context;
  const {
    stats,
    weaponStage,
    overloadDamage,
    overloadCooldown,
    circuitFinale
  } = common;

  if (orbTimer.current > 0) return;

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
