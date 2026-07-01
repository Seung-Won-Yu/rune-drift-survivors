import { useRef } from 'react';

export function useVisualFrameGate(visualQuality = 'high', balancedFps = 30, lowFps = 18) {
  const nextAt = useRef(0);

  return elapsed => {
    const fps = visualQuality === 'low' ? lowFps : visualQuality === 'balanced' ? balancedFps : 60;
    if (fps >= 58) return true;
    if (elapsed < nextAt.current) return false;
    nextAt.current = elapsed + 1 / fps;
    return true;
  };
}
