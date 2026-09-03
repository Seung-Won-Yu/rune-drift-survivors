import { useEffect, useRef } from 'react';

import { SHRINE_SITES } from '../config/gameData.js';
import { MAX_ENEMIES, MAX_PROJECTILES, MAX_XP_GEMS } from '../config/gameTuning.js';
import {
  createInitialGame,
  createQaBossGame,
  createQaCombatGame,
  createQaResultGame,
  createQaStressGame
} from '../systems/gameState.js';
import { getShrineActivationAlert } from '../systems/shrineRuntime.js';
import {
  getBladeOrbitRadius,
  getBuildFocus,
  getRunPhaseTransition,
  getWeaponStage
} from '../systems/progression.js';
import { getRuneCircuitState } from '../systems/runeCircuit.js';
import { pickUpgrades } from '../systems/upgradeDrafting.js';

export function getQaGameSnapshot(game) {
  const circuit = getRuneCircuitState(game);
  const weaponStage = getWeaponStage(game);
  const bladeFocus = getBuildFocus(game, 'blade');
  return {
    phase: game.phase,
    result: game.result,
    time: Number(game.time.toFixed(2)),
    level: game.level,
    xp: Number(game.xp.toFixed(2)),
    xpToNext: game.xpToNext,
    kills: game.kills,
    wave: game.wave,
    hp: Number(game.stats.hp.toFixed(2)),
    maxHp: game.stats.maxHp,
    eliteKills: game.eliteKills ?? 0,
    bossKills: game.bossKills ?? 0,
    shrineActivations: game.shrineActivations ?? 0,
    buildFocus: { ...game.buildFocus },
    upgrades: [...game.upgrades],
    replayRouteFamily: game.replayRouteFamily,
    weaponRanges: {
      bladeOrbit: Number(getBladeOrbitRadius(game.stats, weaponStage, bladeFocus).toFixed(2))
    },
    circuit: {
      complete: circuit.complete,
      completed: circuit.completed,
      ready: circuit.ready,
      distance: circuit.distance,
      direction: circuit.direction?.arrow ?? null,
      nextSite: circuit.nextSite?.id ?? null
    },
    runStats: {
      totalDamage: Number((game.runStats?.totalDamage ?? 0).toFixed(2)),
      damageBySource: { ...game.runStats?.damageBySource },
      damageByPhase: Object.fromEntries(
        Object.entries(game.runStats?.damageByPhase ?? {}).map(([phaseId, damage]) => (
          [phaseId, { ...damage }]
        ))
      ),
      damageTaken: Number((game.runStats?.damageTaken ?? 0).toFixed(2)),
      damageTakenByPhase: { ...game.runStats?.damageTakenByPhase },
      healingReceived: Number((game.runStats?.healingReceived ?? 0).toFixed(2)),
      healingByPhase: { ...game.runStats?.healingByPhase }
    }
  };
}

export function useRuneQaControls({ game, sceneApi, setGame, setUpgradeChoices }) {
  const gameRef = useRef(game);
  gameRef.current = game;

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
      contactAttack: () => {
        const nextGame = {
          ...createInitialGame(),
          onboardingMovement: 42,
          dashUses: 1
        };
        showQaGame(nextGame);
        window.setTimeout(() => sceneApi.current?.contactAttack?.(), 140);
      },
      combat: () => {
        showQaGame(createQaCombatGame());
        [140, 300].forEach(delay => {
          window.setTimeout(() => sceneApi.current?.combatIdentity?.(), delay);
        });
      },
      threats: () => {
        showQaGame({ ...createQaCombatGame(), phase: 'qa-preview' });
        [140, 300].forEach(delay => {
          window.setTimeout(() => sceneApi.current?.threatIdentity?.(), delay);
        });
      },
      circuit: () => {
        showQaGame({
          ...createInitialGame(),
          phase: 'playing',
          time: 20,
          kills: 8,
          xp: 12,
          onboardingMovement: 42,
          dashUses: 1
        });
      },
      seal: () => {
        const shrine = SHRINE_SITES[0];
        const openingGame = {
          ...createInitialGame(),
          phase: 'playing',
          time: 28,
          kills: 16,
          onboardingMovement: 48,
          dashUses: 1
        };
        showQaGame({
          ...openingGame,
          shrineActivations: 1,
          activatedShrines: { [shrine.id]: true },
          pickupMessage: '룬 회로 1/4 · 빌드 보급',
          pickupFlash: 2.8,
          encounterAlert: getShrineActivationAlert(shrine, openingGame),
          encounterAlertTimer: 2.8
        });
      },
      phase: () => {
        showQaGame({
          ...createInitialGame(),
          phase: 'playing',
          time: 46,
          level: 3,
          kills: 38,
          xp: 18,
          xpToNext: 58,
          onboardingMovement: 90,
          dashUses: 2,
          encounterAlert: getRunPhaseTransition(44.9, 45.1),
          encounterAlertTimer: 3.2
        });
      },
      objectives: () => {
        showQaGame({
          ...createInitialGame(),
          phase: 'playing',
          time: 182,
          level: 8,
          kills: 284,
          eliteKills: 2,
          shrineActivations: 3,
          activatedShrines: { armory: true, vital: true, purge: true },
          buildFocus: { orb: 2, storm: 3, blade: 0, chain: 2, nova: 0 },
          onboardingMovement: 120,
          dashUses: 4
        });
      },
      metrics: () => sceneApi.current?.metrics?.(),
      snapshot: () => getQaGameSnapshot(gameRef.current),
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
      reset: options => {
        sceneApi.current?.reset();
        setUpgradeChoices([]);
        setGame(createInitialGame(options));
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
    } else if (qaMode === 'contact') {
      window.setTimeout(() => window.__RUNE_DRIFT_QA__?.contactAttack(), 120);
    } else if (qaMode === 'combat') {
      window.setTimeout(() => window.__RUNE_DRIFT_QA__?.combat(), 120);
    } else if (qaMode === 'threats') {
      window.setTimeout(() => window.__RUNE_DRIFT_QA__?.threats(), 120);
    } else if (qaMode === 'circuit') {
      window.setTimeout(() => window.__RUNE_DRIFT_QA__?.circuit(), 120);
    } else if (qaMode === 'seal') {
      window.setTimeout(() => window.__RUNE_DRIFT_QA__?.seal(), 120);
    } else if (qaMode === 'phase') {
      window.setTimeout(() => window.__RUNE_DRIFT_QA__?.phase(), 120);
    } else if (qaMode === 'objectives') {
      window.setTimeout(() => window.__RUNE_DRIFT_QA__?.objectives(), 120);
    } else if (qaMode === 'victory' || qaMode === 'survived' || qaMode === 'defeat') {
      window.setTimeout(() => window.__RUNE_DRIFT_QA__?.result(qaMode), 120);
    }

    return () => {
      delete window.__RUNE_DRIFT_QA__;
    };
  }, [sceneApi, setGame, setUpgradeChoices]);
}
