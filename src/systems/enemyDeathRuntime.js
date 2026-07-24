import { MAX_FIELD_ITEMS } from '../config/gameTuning.js';
import {
  createSplitRunner,
  getEnemyAccentColor
} from './enemyDirector.js';
import {
  createFieldItem,
  pickFieldItemType
} from './fieldItemDirector.js';
import { getPlayerTerrainY } from './terrain.js';

export function resolveDefeatedEnemies({
  currentGame,
  runtimeBudget,
  player,
  enemies,
  fieldItems,
  fieldItemDropLock,
  spawnWarnings,
  hitBursts,
  spawnedEnemies,
  addXpGem,
  addDamageNumber,
  canAddHitBurst
}) {
  let kills = 0;
  let eliteKills = 0;
  let bossKills = 0;
  const alive = [];

  for (const enemy of enemies.current) {
    if (enemy.hp <= 0) {
      kills += 1;
      if (enemy.kind === 'elite') eliteKills += 1;
      if (enemy.kind === 'boss') bossKills += 1;
      const gemPos = enemy.pos.clone();
      gemPos.y += enemy.kind === 'boss' || enemy.kind === 'elite' ? 1.08 : 0.76;
      addXpGem(gemPos, enemy.xp);
      if (fieldItemDropLock.current <= 0 && fieldItems.current.length < MAX_FIELD_ITEMS) {
        const dropChance = enemy.kind === 'boss' || enemy.kind === 'elite' ? 1 : enemy.kind === 'brute' ? 0.09 : enemy.kind === 'runner' ? 0.028 : 0.038;
        if (Math.random() < dropChance) {
          const dropPos = enemy.pos.clone();
          dropPos.y = getPlayerTerrainY(dropPos.x, dropPos.z) + 0.42;
          const dropType = enemy.kind === 'boss'
            ? 'purge'
            : enemy.kind === 'elite'
              ? (Math.random() < 0.45 ? 'cache' : Math.random() < 0.74 ? 'overload' : 'heal')
              : Math.random() > 0.76 ? 'purge' : pickFieldItemType(currentGame);
          fieldItems.current.push(createFieldItem(dropType, dropPos));
          fieldItemDropLock.current = enemy.kind === 'boss' || enemy.kind === 'elite' ? 3.2 : 6.2;
        }
      }
      if (canAddHitBurst(10)) {
        const isBoss = enemy.kind === 'boss';
        const isElite = enemy.kind === 'elite';
        const life = isBoss ? 0.9 : isElite ? 0.58 : 0.34;
        hitBursts.current.push({
          pos: enemy.pos.clone(),
          life,
          maxLife: life,
          color: isBoss || isElite ? getEnemyAccentColor(enemy) : '#75ddd2',
          type: isBoss ? 'bossDeath' : isElite ? 'eliteDeath' : 'death',
          stage: isBoss ? 5 : isElite ? 3 : 1,
          radius: isBoss ? 4.2 : isElite ? 2.3 : 1.2
        });
      }
      addDamageNumber(
        enemy.pos,
        enemy.kind === 'boss' ? 'BOSS DOWN' : enemy.kind === 'elite' ? 'ELITE DOWN' : `+${enemy.xp}`,
        enemy.kind === 'boss' || enemy.kind === 'elite' ? getEnemyAccentColor(enemy) : '#75ddd2',
        enemy.kind === 'boss' || enemy.kind === 'elite' ? 0.95 : 0.54
      );
      if (enemy.canSplit && enemies.current.length + spawnedEnemies.length < runtimeBudget.maxEnemies - 4) {
        const splitCount = enemy.kind === 'brute' ? 3 : 2;
        for (let index = 0; index < splitCount; index += 1) {
          spawnedEnemies.push(createSplitRunner(enemy, currentGame.wave, player.current.pos, index));
        }
        spawnWarnings.current.push({
          pos: enemy.pos.clone(),
          life: 0.56,
          maxLife: 0.56,
          color: '#aa91cf',
          label: 'SPLIT'
        });
      }
    } else {
      alive.push(enemy);
    }
  }

  enemies.current = alive;
  return { kills, eliteKills, bossKills };
}
