import { ART_TOKENS } from '../config/gameData.js';
import { getBuildFocus } from './progression.js';
import {
  advancePlayerMovement,
  samplePlayerControls
} from './playerMovementRuntime.js';
import { updatePlayerPresentation } from './playerPresentationRuntime.js';

export function damagePlayerRuntime({
  amount,
  game,
  updateGame,
  invuln = 0.62,
  player,
  hitBursts,
  cameraShake,
  addDamageNumber
}) {
  if (player.current.invuln > 0) return false;
  const bladeFocus = getBuildFocus(game, 'blade');
  const guardedAmount = bladeFocus >= 2
    ? amount * (1 - Math.min(0.28, bladeFocus * 0.055))
    : amount;
  player.current.invuln = invuln;
  player.current.hurtPulse = Math.max(player.current.hurtPulse ?? 0, 0.62);
  cameraShake.current = Math.max(cameraShake.current, 0.28);
  const damageValue = Math.ceil(guardedAmount);
  hitBursts.current.push({
    pos: player.current.pos.clone(),
    life: 0.42,
    maxLife: 0.42,
    color: ART_TOKENS.dangerRed,
    type: 'playerHit',
    stage: 4,
    radius: 3.2
  });
  addDamageNumber(player.current.pos, `-${damageValue}`, ART_TOKENS.dangerRed, 0.82);
  updateGame(current => {
    const nextHp = Math.max(0, current.stats.hp - guardedAmount);
    const hpRatio = nextHp / current.stats.maxHp;
    return {
      ...current,
      phase: nextHp <= 0 ? 'ended' : current.phase,
      result: nextHp <= 0 ? 'defeat' : current.result,
      damageFlash: 0.62,
      damageMessage: hpRatio <= 0.34 ? '위험: 체력 낮음' : `피격 -${damageValue}`,
      stats: { ...current.stats, hp: nextHp }
    };
  });
  return true;
}

export function updatePlayerRuntime({
  dt,
  stats,
  updateGame,
  player,
  playerMesh,
  keys,
  dashQueued,
  touchControlsRef,
  scratch,
  hitBursts,
  weaponEffects,
  cameraShake,
  addDamageNumber
}) {
  const input = scratch.input;
  const hasInput = samplePlayerControls({
    keys,
    dashQueued,
    touchControlsRef,
    player,
    input
  });
  player.current.invuln = Math.max(0, player.current.invuln - dt);
  player.current.castPulse = Math.max(0, (player.current.castPulse ?? 0) - dt * 3.6);
  player.current.hurtPulse = Math.max(0, (player.current.hurtPulse ?? 0) - dt * 2.8);

  const startedDash = advancePlayerMovement({
    dt,
    stats,
    player,
    scratch,
    input,
    hasInput
  });
  if (startedDash) {
    hitBursts.current.push({
      pos: player.current.pos.clone(),
      life: 0.34,
      maxLife: 0.34,
      color: '#58b9d4',
      type: 'dash',
      stage: 4,
      radius: 3.2
    });
    weaponEffects.current.push({
      type: 'ring',
      pos: player.current.pos.clone(),
      life: 0.34,
      maxLife: 0.34,
      color: '#58b9d4',
      radius: 7.2
    });
    addDamageNumber(player.current.pos, '회피', '#7fc9d8', 0.74);
    cameraShake.current = Math.max(cameraShake.current, 0.18);
    updateGame(current => ({ ...current, dashUses: (current.dashUses ?? 0) + 1 }));
  }

  updatePlayerPresentation({ player, playerMesh });
}
