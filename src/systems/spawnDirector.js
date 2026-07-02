import {
  BOSS_WAVE_SCHEDULE,
  ELITE_ROLE_META,
  SURGE_EVENTS
} from '../config/gameData.js';
import {
  applyCombatRhythm,
  createBoss,
  createElite,
  createEnemy,
  getEnemyAccentColor,
  getSpawnColor
} from './enemyDirector.js';
import {
  getCombatRhythm,
  getDirectorPressure,
  getWaveProfile
} from './enemyPacing.js';

export function updateEnemySpawning({
  dt,
  currentGame,
  updateGame,
  runtimeBudget,
  player,
  enemies,
  spawnTimer,
  surgeIndex,
  spawnWarnings,
  hitBursts,
  cameraShake,
  eliteSpawnedMinute,
  bossSpawnedWave,
  showEncounterAlert
}) {
  spawnTimer.current -= dt;
  const waveProfile = getWaveProfile(currentGame.wave);
  const pressure = getDirectorPressure(currentGame);
  const rhythm = getCombatRhythm(currentGame);
  const openingEase = currentGame.time < 30 ? 0.68 + currentGame.time / 30 * 0.26 : 1;
  const enemyLimit = runtimeBudget.maxEnemies;
  const targetCount = Math.min(Math.floor((waveProfile.targetBase + currentGame.wave * 7) * pressure * openingEase * rhythm.target), enemyLimit - 12);
  const minuteMark = Math.floor(currentGame.time / 60);
  const nextSurge = SURGE_EVENTS[surgeIndex.current];

  if (nextSurge && currentGame.time >= nextSurge.time && enemies.current.length < enemyLimit - 8) {
    const count = Math.min(nextSurge.count + Math.floor(currentGame.wave / 2), enemyLimit - enemies.current.length);
    for (let i = 0; i < count; i += 1) {
      const enemy = applyCombatRhythm(createEnemy(currentGame.wave + 1, waveProfile, player.current.pos), rhythm);
      enemy.surge = true;
      enemy.hp *= 1.16;
      enemy.maxHp *= 1.16;
      enemy.damage *= 1.28;
      enemy.speed *= 1.12;
      enemies.current.push(enemy);
      if (i < 5) {
        spawnWarnings.current.push({
          pos: enemy.pos.clone(),
          life: 1.08,
          maxLife: 1.08,
          color: nextSurge.color,
          label: i === 0 ? nextSurge.label : ''
        });
      }
    }
    hitBursts.current.push({
      pos: player.current.pos.clone(),
      life: 0.96,
      maxLife: 0.96,
      color: nextSurge.color,
      type: 'surge',
      stage: 5,
      radius: 12
    });
    cameraShake.current = Math.max(cameraShake.current, 0.36);
    showEncounterAlert(updateGame, {
      kind: 'surge',
      label: nextSurge.label,
      title: nextSurge.message,
      hint: '빈 공간 확보',
      color: nextSurge.color,
      message: nextSurge.message,
      flash: 3.4
    }, 3.4);
    surgeIndex.current += 1;
  }

  if (minuteMark >= 1 && minuteMark <= 4 && eliteSpawnedMinute.current < minuteMark) {
    const elite = createElite(minuteMark, currentGame.wave, player.current.pos);
    const meta = ELITE_ROLE_META[elite.role] ?? ELITE_ROLE_META.charger;
    enemies.current.push(elite);
    spawnWarnings.current.push({
      pos: elite.pos.clone(),
      life: 1.65,
      maxLife: 1.65,
      color: meta.color,
      label: `RIFT ${meta.label}`,
      radius: 3.0
    });
    hitBursts.current.push({
      pos: elite.pos.clone(),
      life: 0.95,
      maxLife: 0.95,
      color: getEnemyAccentColor(elite),
      type: 'elite',
      stage: 3,
      radius: 3.2
    });
    showEncounterAlert(updateGame, {
      kind: 'elite',
      label: `RIFT ${meta.label}`,
      title: meta.name,
      hint: `약점: ${meta.hint}`,
      color: meta.color,
      threat: {
        kind: 'elite',
        label: meta.label,
        name: meta.name,
        weakness: meta.hint,
        color: meta.color
      }
    }, 3.6);
    eliteSpawnedMinute.current = minuteMark;
  }

  if (BOSS_WAVE_SCHEDULE.includes(currentGame.wave) && bossSpawnedWave.current < currentGame.wave) {
    const boss = createBoss(currentGame.wave, player.current.pos);
    enemies.current.push(boss);
    spawnWarnings.current.push({
      pos: boss.pos.clone(),
      life: 1.45,
      maxLife: 1.45,
      color: getEnemyAccentColor(boss),
      label: 'RIFT BEAST',
      radius: 4.2
    });
    hitBursts.current.push({ pos: boss.pos.clone(), life: 1.1, maxLife: 1.1, color: '#ffdf6e' });
    showEncounterAlert(updateGame, {
      kind: 'boss',
      label: 'RIFT BEAST',
      title: '균열 보스 출현',
      hint: '패턴 예고 확인',
      color: '#ffdf6e',
      threat: {
        kind: 'boss',
        label: 'RIFT BEAST',
        name: '균열 보스',
        weakness: '예고 후 회피',
        color: '#ffdf6e'
      }
    }, 4.0);
    bossSpawnedWave.current = currentGame.wave;
  }

  if (spawnTimer.current <= 0 && enemies.current.length < targetCount) {
    const missing = targetCount - enemies.current.length;
    const catchUp = missing > 42 ? 6 : missing > 26 ? 4 : missing > 14 ? 2 : 0;
    const amount = Math.min(
      18,
      enemyLimit - enemies.current.length,
      Math.ceil((waveProfile.spawnBase + Math.floor(currentGame.time / 72) + catchUp) * Math.min(1.24, pressure) * openingEase * rhythm.spawn)
    );
    for (let i = 0; i < amount; i += 1) {
      const enemy = applyCombatRhythm(createEnemy(currentGame.wave, waveProfile, player.current.pos), rhythm);
      enemies.current.push(enemy);
      if (i === 0 || currentGame.wave > 2) {
        spawnWarnings.current.push({
          pos: enemy.pos.clone(),
          life: 0.78,
          maxLife: 0.78,
          color: getSpawnColor(enemy.kind),
          label: ''
        });
      }
    }
    spawnTimer.current = Math.max(0.24, (waveProfile.interval - currentGame.wave * 0.018) / Math.max(0.8, rhythm.spawn));
  }
}
