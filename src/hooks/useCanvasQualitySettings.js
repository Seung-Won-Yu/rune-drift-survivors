import { useMemo } from 'react';

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
  const canvasCamera = useMemo(() => ({
    position: runtimeVisualQuality === 'low' ? [0, 34, 56] : runtimeVisualQuality === 'balanced' ? [0, 36, 60] : [0, 38, 62],
    fov: runtimeVisualQuality === 'low' ? 49 : 47,
    near: 0.1,
    far: 420
  }), [runtimeVisualQuality]);
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
