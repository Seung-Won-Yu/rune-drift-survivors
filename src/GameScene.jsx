import { useFrame } from '@react-three/fiber';

import { RUN_DURATION } from './config/gameTuning.js';
import { useGameSceneEffects } from './hooks/useGameSceneEffects.js';
import { useGameSceneRuntime } from './hooks/useGameSceneRuntime.js';
import { getStateSyncInterval } from './hooks/useVisualQuality.js';
import { createGameSceneActions } from './systems/gameSceneActions.js';
import { getRunPhase } from './systems/progression.js';
import { applyFrameStateUpdate } from './systems/runFrameState.js';
import {
  getBossStatusSnapshot,
  getRunStatsSnapshot,
  recordFrameSample
} from './systems/runTelemetry.js';
import { GameWorld } from './world/GameWorld.jsx';

export function GameScene({ refApi, game, setGame, onLevelUp, visualQuality = 'high', touchControlsRef }) {
  const runtime = useGameSceneRuntime(visualQuality);
  const {
    player,
    enemies,
    projectiles,
    xpGems,
    fieldItems,
    shrines,
    hitBursts,
    damageNumbers,
    spawnWarnings,
    runStats,
    frameStats,
    gemMesh,
    playerMesh,
    weaponEffects,
    stateSyncElapsed,
    updateFramePressure
  } = runtime;
  const {
    updatePlayer,
    updateSpawning,
    trimRuntimePools,
    updateWeapons,
    updateProjectiles,
    rebuildProjectileGrid,
    updateEnemies,
    updateGems,
    updateFieldItems,
    updateShrines,
    updateFeedback,
    updateCamera,
    renderInstances
  } = createGameSceneActions({
    runtime,
    visualQuality,
    touchControlsRef
  });

  useGameSceneEffects({
    runtime,
    game,
    refApi,
    visualQuality,
    touchControlsRef,
    onLevelUp
  });

  useFrame((state, delta) => {
    recordFrameSample(frameStats, delta);
    updateFramePressure(delta, game.phase);
    const dt = Math.min(delta, 0.033);
    if (game.phase !== 'playing') {
      stateSyncElapsed.current = 0;
      renderInstances();
      return;
    }

    runStats.current.phaseId = getRunPhase(game).id;

    stateSyncElapsed.current += dt;
    const stateSyncInterval = getStateSyncInterval(visualQuality, game);
    if (stateSyncElapsed.current >= stateSyncInterval || game.time + stateSyncElapsed.current >= RUN_DURATION) {
      const elapsed = stateSyncElapsed.current;
      stateSyncElapsed.current = 0;
      const bossStatus = getBossStatusSnapshot(enemies);
      const runStatsSnapshot = getRunStatsSnapshot(runStats);
      setGame(current => applyFrameStateUpdate({
        current,
        elapsed,
        player: player.current,
        bossStatus,
        runStats: runStatsSnapshot
      }));
    }

    updatePlayer(dt, game.stats, setGame);
    updateSpawning(dt, game, setGame);
    trimRuntimePools();
    updateWeapons(dt, game);
    updateProjectiles(dt, game.stats, game);
    rebuildProjectileGrid();
    updateEnemies(dt, game, setGame);
    trimRuntimePools();
    updateGems(dt, game, setGame, onLevelUp);
    updateFieldItems(dt, game, setGame);
    updateShrines(dt, game, setGame);
    updateFeedback(dt);
    updateCamera(state.camera, dt);
    renderInstances();
  });

  return (
    <GameWorld
      game={game}
      visualQuality={visualQuality}
      player={player}
      playerMesh={playerMesh}
      enemies={enemies}
      gemMesh={gemMesh}
      xpGems={xpGems}
      fieldItems={fieldItems}
      shrines={shrines}
      projectiles={projectiles}
      weaponEffects={weaponEffects}
      hitBursts={hitBursts}
      damageNumbers={damageNumbers}
      spawnWarnings={spawnWarnings}
    />
  );
}
