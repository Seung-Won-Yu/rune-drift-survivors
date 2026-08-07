import { useEffect } from 'react';

import { populateContactAttackScene } from '../qa/populateContactAttackScene.js';
import { populateStressScene } from '../qa/populateStressScene.js';

export function useGameSceneEffects({
  runtime,
  game,
  refApi,
  visualQuality,
  touchControlsRef,
  onLevelUp
}) {
  const {
    keys,
    dashQueued,
    player,
    enemies,
    projectiles,
    xpGems,
    hitBursts,
    weaponEffects,
    damageNumbers,
    spawnWarnings,
    levelUpQueued,
    resetRuntime,
    getMetrics
  } = runtime;

  useEffect(() => {
    const down = event => {
      if (game.phase !== 'playing') return;
      keys.current.add(event.code);
      if (event.code === 'Space') {
        if (!event.repeat) dashQueued.current = true;
        event.preventDefault();
      }
    };
    const up = event => keys.current.delete(event.code);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [dashQueued, game.phase, keys]);

  useEffect(() => {
    refApi.current = {
      reset: () => resetRuntime(touchControlsRef),
      stress: (options = {}) => {
        populateStressScene({
          options,
          visualQuality,
          player,
          enemies,
          projectiles,
          xpGems,
          hitBursts,
          weaponEffects,
          damageNumbers,
          spawnWarnings
        });
      },
      contactAttack: () => {
        populateContactAttackScene({
          player,
          enemies,
          projectiles,
          xpGems,
          hitBursts,
          weaponEffects,
          damageNumbers,
          spawnWarnings
        });
      },
      metrics: getMetrics
    };
  }, [
    refApi,
    touchControlsRef,
    visualQuality,
    resetRuntime,
    getMetrics,
    player,
    enemies,
    projectiles,
    xpGems,
    hitBursts,
    weaponEffects,
    damageNumbers,
    spawnWarnings
  ]);

  useEffect(() => {
    if (game.phase !== 'playing') return;
    levelUpQueued.current = false;
    if ((game.pendingUpgrades ?? 0) > 0) {
      levelUpQueued.current = true;
      window.setTimeout(onLevelUp, 0);
    }
  }, [game.phase, game.pendingUpgrades, levelUpQueued, onLevelUp]);
}
