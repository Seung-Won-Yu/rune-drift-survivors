import { Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { Environment, useGLTF } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import {
  BALANCED_PRELOAD_MODEL_URLS,
  CORE_PRELOAD_MODEL_URLS,
  HIGH_DETAIL_PRELOAD_MODEL_URLS
} from './config/assets.js';
import { useVisualQuality } from './hooks/useVisualQuality.js';
import { useCanvasQualitySettings } from './hooks/useCanvasQualitySettings.js';
import { useGameAudio } from './hooks/useGameAudio.js';
import { createInitialGame } from './systems/gameState.js';
import {
  applyBuildFocus,
  getFocusMessage,
  getUpgradeFocusKey,
  isWeaponFamilyAtCap
} from './systems/progression.js';
import { pickUpgrades } from './systems/upgradeDrafting.js';
import { useRuneQaControls } from './qa/useRuneQaControls.js';
import { HUD } from './ui/GameHud.jsx';
import { EndOverlay, PauseOverlay, UpgradeOverlay } from './ui/GameOverlays.jsx';
import { LoadingOverlay } from './ui/LoadingOverlay.jsx';
import { createTouchControlsState, TouchControls } from './ui/TouchControls.jsx';
import { GameScene } from './GameScene.jsx';
import { AUDIO_CUE, emitAudioCue } from './audio/audioCues.js';
import './styles.css';

const preloadedModelUrls = new Set();

function preloadModelUrls(urls) {
  urls.forEach(url => {
    if (preloadedModelUrls.has(url)) return;
    preloadedModelUrls.add(url);
    useGLTF.preload(url);
  });
}

function ModelPreloads({ visualQuality }) {
  useEffect(() => {
    preloadModelUrls(CORE_PRELOAD_MODEL_URLS);
    if (visualQuality !== 'low') {
      preloadModelUrls(BALANCED_PRELOAD_MODEL_URLS);
    }
    if (visualQuality === 'high') {
      preloadModelUrls(HIGH_DETAIL_PRELOAD_MODEL_URLS);
    }
  }, [visualQuality]);

  return null;
}

function App() {
  const [game, setGame] = useState(() => createInitialGame());
  const [upgradeChoices, setUpgradeChoices] = useState([]);
  const sceneApi = useRef(null);
  const touchControls = useRef(createTouchControlsState());
  const visualQuality = useVisualQuality();
  const { muted: audioMuted, toggleMuted: toggleAudioMuted } = useGameAudio();
  const {
    runtimeVisualQuality,
    enablePostFx,
    enableEnvironment,
    canvasDpr,
    canvasCamera,
    canvasGl
  } = useCanvasQualitySettings(visualQuality, game);

  const togglePause = () => {
    setGame(current => {
      if (current.phase === 'playing') return { ...current, phase: 'paused' };
      if (current.phase === 'paused') return { ...current, phase: 'playing' };
      return current;
    });
  };

  const resume = () => {
    setGame(current => current.phase === 'paused' ? { ...current, phase: 'playing' } : current);
  };

  const chooseUpgrade = upgrade => {
    setGame(current => {
      const nextStats = upgrade.apply(current.stats);
      const focusKey = getUpgradeFocusKey(upgrade);
      if (focusKey && isWeaponFamilyAtCap(current, focusKey)) return current;
      const nextBuildFocus = applyBuildFocus(current.buildFocus, focusKey);
      const focusMessage = getFocusMessage(focusKey, nextBuildFocus);
      const nextPending = Math.max(0, (current.pendingUpgrades ?? 1) - 1);
      const nextGame = {
        ...current,
        phase: nextPending > 0 ? 'upgrade' : 'playing',
        pendingUpgrades: nextPending,
        stats: nextStats,
        buildFocus: nextBuildFocus,
        upgrades: [...current.upgrades, upgrade.id],
        pickupMessage: focusMessage || `${upgrade.title} 강화`,
        pickupFlash: 2.2
      };
      emitAudioCue(AUDIO_CUE.upgradeSelect, { variant: focusKey ?? 'utility' });
      window.setTimeout(() => {
        setUpgradeChoices(nextPending > 0 ? pickUpgrades(nextGame) : []);
      }, 0);
      return nextGame;
    });
  };

  const restart = () => {
    sceneApi.current?.reset();
    setUpgradeChoices([]);
    setGame(createInitialGame());
  };

  const onLevelUp = () => {
    emitAudioCue(AUDIO_CUE.levelUp);
    setGame(current => {
      if ((current.pendingUpgrades ?? 0) <= 0) return current;
      setUpgradeChoices(pickUpgrades(current));
      return { ...current, phase: 'upgrade' };
    });
  };

  useEffect(() => {
    const onKeyDown = event => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code !== 'Escape' && event.code !== 'KeyP') return;
      event.preventDefault();
      togglePause();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useRuneQaControls({ sceneApi, setGame, setUpgradeChoices });

  return (
    <main className={`shell visual-${runtimeVisualQuality} ${game.damageFlash > 0 ? 'isHurt' : ''} ${game.stats.hp / game.stats.maxHp <= 0.34 ? 'isLowHp' : ''}`}>
      <ModelPreloads visualQuality={runtimeVisualQuality} />
      <Canvas
        shadows={false}
        camera={canvasCamera}
        dpr={canvasDpr}
        gl={canvasGl}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0.92, 0);
          camera.updateProjectionMatrix();
        }}
      >
        <color attach="background" args={['#06100e']} />
        <fog attach="fog" args={['#132522', 86, 264]} />
        <GameScene
          refApi={sceneApi}
          game={game}
          setGame={setGame}
          onLevelUp={onLevelUp}
          visualQuality={runtimeVisualQuality}
          touchControlsRef={touchControls}
        />
        {enableEnvironment && (
          <Suspense fallback={null}>
            <Environment preset="sunset" />
          </Suspense>
        )}
        {enablePostFx && (
          <EffectComposer>
            <Bloom luminanceThreshold={0.34} intensity={0.72} mipmapBlur />
            <Vignette eskil={false} offset={0.2} darkness={0.62} />
          </EffectComposer>
        )}
      </Canvas>
      <LoadingOverlay />
      <HUD
        game={game}
        onRestart={restart}
        onPause={togglePause}
        audioMuted={audioMuted}
        onToggleAudio={toggleAudioMuted}
      />
      {game.phase === 'playing' && <TouchControls controlsRef={touchControls} />}
      {game.phase === 'paused' && <PauseOverlay game={game} onResume={resume} onRestart={restart} />}
      {game.phase === 'upgrade' && (
        <UpgradeOverlay game={game} choices={upgradeChoices} onChoose={chooseUpgrade} />
      )}
      {game.phase === 'ended' && <EndOverlay game={game} onRestart={restart} />}
    </main>
  );
}

const rootNode = document.getElementById('root');
const root = window.__RUNE_DRIFT_ROOT__ ?? createRoot(rootNode);
window.__RUNE_DRIFT_ROOT__ = root;
root.render(<App />);
