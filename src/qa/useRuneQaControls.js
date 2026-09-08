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
    fieldDetour: game.fieldDetour ? { ...game.fieldDetour, direction: { ...game.fieldDetour.direction } } : null,
    itemPickups: { ...game.itemPickups },
    overloadTimer: game.overloadTimer,
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
  const revisionRef = useRef(0);
  gameRef.current = game;

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;

    let pending = false;
    let disposed = false;
    // Resolve only after the R3F scene receives the requested state. No delayed
    // replay can overwrite a subsequent reset, upgrade choice or user action.
    const showQaGame = (input, prepare, choices = []) => {
      const token = ++revisionRef.current;
      const nextGame = { ...input, qaRevision: token };
      pending = true;
      sceneApi.current?.reset();
      gameRef.current = nextGame;
      setUpgradeChoices(choices);
      setGame(nextGame);
      return new Promise(resolve => {
        const apply = () => {
          if (disposed || revisionRef.current !== token) { resolve(false); return; }
          const api = sceneApi.current;
          if (api?.state?.()?.qaRevision !== token) { window.requestAnimationFrame(apply); return; }
          api.reset();
          prepare?.(api);
          pending = false;
          resolve(true);
        };
        window.requestAnimationFrame(apply);
      });
    };

    window.__RUNE_DRIFT_QA__ = {
      ready: () => !pending,
      boss: options => {
        return showQaGame(createQaBossGame(options));
      },
      result: result => {
        return showQaGame(createQaResultGame(result));
      },
      stress: options => {
        const nextGame = { ...createQaStressGame(), qaContinuousFrames: true };
        return showQaGame(nextGame, api => api.stress(options));
      },
      contactAttack: (options = {}) => {
        const nextGame = {
          ...createInitialGame(),
          onboardingMovement: 42,
          dashUses: 1
        };
        if (Number.isFinite(options.hp)) {
          nextGame.stats = { ...nextGame.stats, hp: Math.max(1, Math.min(nextGame.stats.maxHp, options.hp)) };
        }
        return showQaGame(nextGame, api => api.contactAttack());
      },
      combat: () => {
        return showQaGame(createQaCombatGame(), api => api.combatIdentity());
      },
      threats: () => {
        return showQaGame({
          ...createQaCombatGame(),
          phase: 'qa-preview',
          pickupMessage: '',
          pickupFlash: 0
        }, api => api.threatIdentity());
      },
      circuit: () => {
        return showQaGame({
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
        return showQaGame({
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
        return showQaGame({
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
      objectives: (options = {}) => {
        return showQaGame({
          ...createInitialGame(),
          phase: options.phase ?? 'playing',
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
      beginFrameSample: () => sceneApi.current?.beginFrameSample?.(),
      snapshot: () => getQaGameSnapshot(gameRef.current),
      upgrade: () => {
        const nextGame = {
          ...createQaStressGame(),
          phase: 'upgrade',
          pendingUpgrades: 1
        };
        return showQaGame(nextGame, undefined, pickUpgrades(nextGame));
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
        return showQaGame(nextGame, undefined, pickUpgrades(nextGame));
      },
      reset: options => {
        return showQaGame(createInitialGame(options));
      }
    };

    const qaMode = new URLSearchParams(window.location.search).get('qa');
    if (qaMode === 'upgrade') {
      window.__RUNE_DRIFT_QA__?.upgrade();
    } else if (qaMode === 'starter-upgrade') {
      window.__RUNE_DRIFT_QA__?.starterUpgrade();
    } else if (qaMode === 'stress') {
      window.__RUNE_DRIFT_QA__?.stress({
        enemies: MAX_ENEMIES - 6,
        projectiles: MAX_PROJECTILES - 12,
        gems: MAX_XP_GEMS - 24
      });
    } else if (qaMode === 'silhouette') {
      window.__RUNE_DRIFT_QA__?.stress({
        enemies: 92,
        projectiles: 0,
        gems: 0,
        hitBursts: 0,
        weaponEffects: 0
      });
    } else if (qaMode === 'contact') {
      window.__RUNE_DRIFT_QA__?.contactAttack();
    } else if (qaMode === 'combat') {
      window.__RUNE_DRIFT_QA__?.combat();
    } else if (qaMode === 'threats') {
      window.__RUNE_DRIFT_QA__?.threats();
    } else if (qaMode === 'circuit') {
      window.__RUNE_DRIFT_QA__?.circuit();
    } else if (qaMode === 'seal') {
      window.__RUNE_DRIFT_QA__?.seal();
    } else if (qaMode === 'phase') {
      window.__RUNE_DRIFT_QA__?.phase();
    } else if (qaMode === 'objectives') {
      window.__RUNE_DRIFT_QA__?.objectives({ phase: 'qa-preview' });
    } else if (qaMode === 'victory' || qaMode === 'survived' || qaMode === 'defeat') {
      window.__RUNE_DRIFT_QA__?.result(qaMode);
    }

    return () => {
      disposed = true;
      revisionRef.current++;
      delete window.__RUNE_DRIFT_QA__;
    };
  }, [sceneApi, setGame, setUpgradeChoices]);
}
