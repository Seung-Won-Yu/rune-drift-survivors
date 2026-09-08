import { useEffect, useLayoutEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

import { populateCombatIdentityScene } from '../qa/populateCombatIdentityScene.js';
import { populateContactAttackScene } from '../qa/populateContactAttackScene.js';
import { populateStressScene } from '../qa/populateStressScene.js';
import { populateThreatIdentityScene } from '../qa/populateThreatIdentityScene.js';
import { resetFrameStats } from '../systems/runTelemetry.js';

export function useGameSceneEffects({
  runtime,
  game,
  refApi,
  visualQuality,
  touchControlsRef,
  onLevelUp
}) {
  const invalidate = useThree(state => state.invalidate);
  const sceneGame = useRef(game);
  const {
    keys,
    dashQueued,
    player,
    enemies,
    projectiles,
    xpGems,
    fieldItems,
    scheduledFieldItems,
    hitBursts,
    weaponEffects,
    damageNumbers,
    spawnWarnings,
    frameStats,
    levelUpQueued,
    resetRuntime,
    getMetrics
  } = runtime;

  // Publishing a ref during React render can expose an uncommitted scene.
  useLayoutEffect(() => { sceneGame.current = game; }, [game]);

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
    const api = {
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
        resetFrameStats(frameStats);
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
      combatIdentity: () => {
        populateCombatIdentityScene({
          player,
          enemies,
          projectiles,
          xpGems,
          fieldItems,
          scheduledFieldItems,
          hitBursts,
          weaponEffects,
          damageNumbers,
          spawnWarnings
        });
      },
      threatIdentity: () => {
        populateThreatIdentityScene({
          player,
          enemies,
          projectiles,
          xpGems,
          fieldItems,
          scheduledFieldItems,
          hitBursts,
          weaponEffects,
          damageNumbers,
          spawnWarnings
        });
      },
      metrics: getMetrics,
      beginFrameSample: () => resetFrameStats(frameStats),
      state: () => sceneGame.current
    };
    for (const key of ['reset', 'stress', 'contactAttack', 'combatIdentity', 'threatIdentity']) {
      const action = api[key];
      api[key] = (...args) => {
        const result = action(...args);
        invalidate();
        return result;
      };
    }
    refApi.current = api;
    return () => { if (refApi.current === api) refApi.current = null; };
  }, [
    invalidate,
    refApi,
    touchControlsRef,
    visualQuality,
    resetRuntime,
    getMetrics,
    player,
    enemies,
    projectiles,
    xpGems,
    fieldItems,
    scheduledFieldItems,
    hitBursts,
    weaponEffects,
    damageNumbers,
    spawnWarnings,
    frameStats
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
