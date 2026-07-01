import { useEffect } from 'react';

import { MAX_ENEMIES, MAX_PROJECTILES, MAX_XP_GEMS } from '../config/gameTuning.js';
import { createInitialGame, createQaBossGame, createQaResultGame, createQaStressGame } from '../systems/gameState.js';
import { pickUpgrades } from '../systems/progression.js';

export function useRuneQaControls({ sceneApi, setGame, setUpgradeChoices }) {
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;

    const showQaGame = nextGame => {
      sceneApi.current?.reset();
      setUpgradeChoices([]);
      setGame(nextGame);
      window.setTimeout(() => setGame(nextGame), 80);
    };

    window.__RUNE_DRIFT_QA__ = {
      boss: options => {
        showQaGame(createQaBossGame(options));
      },
      result: result => {
        showQaGame(createQaResultGame(result));
      },
      stress: options => {
        const nextGame = createQaStressGame();
        showQaGame(nextGame);
        [120, 260, 620].forEach(delay => {
          window.setTimeout(() => sceneApi.current?.stress?.(options), delay);
        });
      },
      upgrade: () => {
        const nextGame = {
          ...createQaStressGame(),
          phase: 'upgrade',
          pendingUpgrades: 1
        };
        sceneApi.current?.reset();
        setUpgradeChoices(pickUpgrades(nextGame));
        setGame(nextGame);
      },
      starterUpgrade: () => {
        const nextGame = {
          ...createInitialGame(),
          phase: 'upgrade',
          level: 2,
          xp: 0,
          xpToNext: 45,
          pendingUpgrades: 1,
          time: 28,
          kills: 18,
          onboardingMovement: 42,
          dashUses: 1
        };
        sceneApi.current?.reset();
        setUpgradeChoices(pickUpgrades(nextGame));
        setGame(nextGame);
      },
      reset: () => {
        sceneApi.current?.reset();
        setUpgradeChoices([]);
        setGame(createInitialGame());
      }
    };

    const qaMode = new URLSearchParams(window.location.search).get('qa');
    if (qaMode === 'upgrade') {
      window.setTimeout(() => window.__RUNE_DRIFT_QA__?.upgrade(), 120);
    } else if (qaMode === 'starter-upgrade') {
      window.setTimeout(() => window.__RUNE_DRIFT_QA__?.starterUpgrade(), 120);
    } else if (qaMode === 'stress') {
      window.setTimeout(() => window.__RUNE_DRIFT_QA__?.stress({
        enemies: MAX_ENEMIES - 6,
        projectiles: MAX_PROJECTILES - 12,
        gems: MAX_XP_GEMS - 24
      }), 120);
    } else if (qaMode === 'silhouette') {
      window.setTimeout(() => window.__RUNE_DRIFT_QA__?.stress({
        enemies: 92,
        projectiles: 0,
        gems: 0,
        hitBursts: 0,
        weaponEffects: 0
      }), 120);
    } else if (qaMode === 'victory' || qaMode === 'defeat') {
      window.setTimeout(() => window.__RUNE_DRIFT_QA__?.result(qaMode), 120);
    }

    return () => {
      delete window.__RUNE_DRIFT_QA__;
    };
  }, [sceneApi, setGame, setUpgradeChoices]);
}
