import * as THREE from 'three';

import { AUDIO_CUE, emitAudioCue } from '../../audio/audioCues.js';
import { WEAPON_CATALOG as weaponCatalog } from '../../config/gameData.js';
import { applyDamageToEnemy } from '../enemyDirector.js';
import {
  getBladeColor,
  getBladeCount,
  getBuildFocus,
  getSynergyLevel,
  getWeaponStage,
  isWeaponFamilyUnlocked
} from '../progression.js';
import { getCircuitFinaleState } from '../runeCircuit.js';

export function updateBladeWeapon(context, bladeSweep) {
  const {
    player,
    bladeTimer,
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

  if (!bladeSweep.unlocked || bladeTimer.current > 0) return;

  const targets = nearestEnemies(bladeSweep.targetCount, bladeSweep.range);
  if (targets.length === 0) {
    bladeTimer.current = 0.12;
    return;
  }

  emitAudioCue(AUDIO_CUE.weaponCast, { variant: 'blade', intensity: 0.66 });
  pulsePlayerCast(0.2 + bladeSweep.focus * 0.012);
  targets.forEach((enemy, index) => {
    const dealt = applyDamageToEnemy(enemy, bladeSweep.damage * (1 - index * 0.08), 'blade');
    recordDamage('blade', dealt);
    enemy.flash = 0.16;
    addDamageNumber(enemy.pos, Math.ceil(dealt), bladeSweep.color, 0.6);
    if (canAddHitBurst(8)) {
      hitBursts.current.push({
        pos: enemy.pos.clone(),
        life: 0.3,
        maxLife: 0.3,
        color: bladeSweep.color,
        type: 'blade',
        stage: bladeSweep.stage,
        radius: 1.05 + bladeSweep.stage * 0.12
      });
    }
    if (canAddWeaponEffect(6)) {
      weaponEffects.current.push({
        type: 'beam',
        from: new THREE.Vector3(player.current.pos.x, player.current.pos.y + 0.4, player.current.pos.z),
        to: new THREE.Vector3(enemy.pos.x, enemy.pos.y + 0.55, enemy.pos.z),
        life: 0.15,
        maxLife: 0.15,
        color: bladeSweep.color,
        width: 0.16 + bladeSweep.stage * 0.012
      });
    }
  });
  cameraShake.current = Math.max(cameraShake.current, 0.11);
  bladeTimer.current = bladeSweep.cooldown;
}

export function getBladeSweepProfile(game) {
  const stats = game.stats;
  const stage = getWeaponStage(game);
  const focus = getBuildFocus(game, 'blade');
  const synergyLevel = getSynergyLevel(game, 'blade-nova');
  const unlocked = isWeaponFamilyUnlocked(game, 'blade');
  const bladeCount = getBladeCount(stats, focus, unlocked);
  const overloadDamage = game.overloadTimer > 0 ? 1.25 : 1;
  const overloadCooldown = game.overloadTimer > 0 ? 0.58 : 1;
  const circuitFinale = getCircuitFinaleState(game);
  return {
    unlocked,
    stage,
    focus,
    targetCount: Math.min(4, Math.max(1, Math.ceil(bladeCount / 2))),
    range: 10 + stage * 1.2 + focus * 1.1 + synergyLevel * 0.8,
    damage: weaponCatalog[2].damage
      * stats.damage
      * stats.bladeDamage
      * overloadDamage
      * circuitFinale.damageMultiplier
      * (1.35 + focus * 0.08 + synergyLevel * 0.06),
    cooldown: Math.max(
      0.62,
      1.45
        * stats.cooldown
        * overloadCooldown
        * circuitFinale.cooldownMultiplier
        * (1 - Math.min(0.2, focus * 0.03 + synergyLevel * 0.02))
    ),
    color: getBladeColor(stats, stage)
  };
}
