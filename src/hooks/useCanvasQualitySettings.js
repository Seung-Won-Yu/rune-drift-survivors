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
    runtimeVisualQuality === 'low' ? [0.82, 0.92] : runtimeVisualQuality === 'balanced' ? [0.94, 1.04] : [1.0, 1.14]
  ), [runtimeVisualQuality]);
  const canvasCamera = useMemo(() => ({
    position: runtimeVisualQuality === 'low' ? [0, 38, 64] : runtimeVisualQuality === 'balanced' ? [0, 42, 70] : [0, 44, 74],
    fov: runtimeVisualQuality === 'low' ? 50 : 48,
    near: 0.1,
    far: 420
  }), [runtimeVisualQuality]);
  const canvasGl = useMemo(() => ({
    antialias: runtimeVisualQuality !== 'low' && enablePostFx,
    alpha: false,
    depth: true,
    stencil: false,
    powerPreference: runtimeVisualQuality === 'high' && enablePostFx ? 'high-performance' : 'low-power'
  }), [enablePostFx, runtimeVisualQuality]);

  return {
    runtimeVisualQuality,
    enablePostFx,
    enableEnvironment,
    canvasDpr,
    canvasCamera,
    canvasGl
  };
}
