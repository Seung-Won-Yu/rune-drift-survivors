import { useMemo } from 'react';
import { GAME_CAMERA_FOV, getCameraFrame } from '../config/artDirection.js';

import { getRuntimeVisualQuality, isOptionalRenderFeatureEnabled } from './useVisualQuality.js';

export function useCanvasQualitySettings(visualQuality, game) {
  const runtimeVisualQuality = getRuntimeVisualQuality(visualQuality, game);
  const enablePostFx = useMemo(() => (
    runtimeVisualQuality === 'high' && isOptionalRenderFeatureEnabled('fx')
  ), [runtimeVisualQuality]);
  const enableEnvironment = useMemo(() => (
    runtimeVisualQuality === 'high' && isOptionalRenderFeatureEnabled('env')
  ), [runtimeVisualQuality]);
  const canvasDpr = useMemo(() => (
    runtimeVisualQuality === 'low' ? [0.82, 0.92] : runtimeVisualQuality === 'balanced' ? [1.0, 1.12] : [1.0, 1.14]
  ), [runtimeVisualQuality]);
  const canvasCamera = useMemo(() => {
    const aspect = typeof window === 'undefined' ? 16 / 9 : window.innerWidth / window.innerHeight;
    const frame = getCameraFrame(aspect);
    return { position: [0, frame.height, frame.depth], fov: GAME_CAMERA_FOV, near: 0.1, far: 420 };
  }, []);
  const canvasGl = useMemo(() => ({
    antialias: runtimeVisualQuality !== 'low',
    alpha: false,
    depth: true,
    stencil: false,
    powerPreference: runtimeVisualQuality === 'low' ? 'low-power' : 'high-performance'
  }), [runtimeVisualQuality]);

  return {
    runtimeVisualQuality,
    enablePostFx,
    enableEnvironment,
    canvasDpr,
    canvasCamera,
    canvasGl
  };
}
