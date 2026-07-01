import { useEffect, useState } from 'react';
import {
  BALANCED_STATE_SYNC_INTERVAL,
  LOW_STATE_SYNC_INTERVAL,
  RUNTIME_BUDGETS,
  STATE_SYNC_INTERVAL,
  VISUAL_BUDGETS
} from '../config/gameTuning.js';

const VISUAL_QUALITY_VALUES = new Set(['low', 'balanced', 'high']);

export function getVisualBudget(visualQuality = 'high') {
  return VISUAL_BUDGETS[visualQuality] ?? VISUAL_BUDGETS.high;
}

export function getRuntimeBudget(visualQuality = 'high') {
  return RUNTIME_BUDGETS[visualQuality] ?? RUNTIME_BUDGETS.high;
}

export function getRuntimeVisualQuality(baseQuality = 'balanced', game = {}) {
  if (baseQuality === 'low') return 'low';
  const time = game.time ?? 0;
  const wave = game.wave ?? 1;
  const kills = game.kills ?? 0;
  const severePressure = time >= 145 || wave >= 8 || kills >= 280 || Boolean(game.bossStatus?.enraged && time >= 120);
  if (severePressure && !isVisualQualityForced()) return 'balanced';
  if (baseQuality === 'balanced') return 'balanced';
  const heavyPressure = time >= 26 || wave >= 2 || kills >= 34;
  if (heavyPressure) return 'balanced';
  return baseQuality;
}

export function getStateSyncInterval(visualQuality = 'high', game = {}) {
  if (visualQuality === 'low') return LOW_STATE_SYNC_INTERVAL;
  if (visualQuality === 'balanced' || (game.time ?? 0) >= 145) return BALANCED_STATE_SYNC_INTERVAL;
  return STATE_SYNC_INTERVAL;
}

function getForcedVisualQuality() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const queryQuality = params.get('quality')?.toLowerCase();
  if (queryQuality === 'cinematic') return 'high';
  if (VISUAL_QUALITY_VALUES.has(queryQuality)) return queryQuality;
  try {
    const savedQuality = window.localStorage?.getItem('rune-drift-quality')?.toLowerCase();
    return VISUAL_QUALITY_VALUES.has(savedQuality) ? savedQuality : null;
  } catch {
    return null;
  }
}

export function isVisualQualityForced() {
  return getForcedVisualQuality() !== null;
}

export function isOptionalRenderFeatureEnabled(name) {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get(name) === 'on' || params.get('quality') === 'cinematic';
}

function getVisualQuality() {
  if (typeof window === 'undefined') return 'balanced';
  const forcedQuality = getForcedVisualQuality();
  if (forcedQuality) return forcedQuality;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const narrowViewport = window.innerWidth <= 700;
  const portraitViewport = window.innerWidth <= 820 && window.innerHeight >= window.innerWidth;
  const highPixelRatio = window.devicePixelRatio >= 2;
  const lowMemory = navigator.deviceMemory !== undefined && navigator.deviceMemory <= 4;
  const lowCore = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4;
  if (reducedMotion || coarsePointer || (narrowViewport && (highPixelRatio || lowMemory || lowCore))) return 'low';
  if (portraitViewport || narrowViewport || lowMemory || lowCore) return 'balanced';
  return 'balanced';
}

export function useVisualQuality() {
  const [quality, setQuality] = useState(() => getVisualQuality());

  useEffect(() => {
    const update = () => setQuality(getVisualQuality());
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    window.addEventListener('resize', update);
    reducedMotion?.addEventListener?.('change', update);
    return () => {
      window.removeEventListener('resize', update);
      reducedMotion?.removeEventListener?.('change', update);
    };
  }, []);

  return quality;
}
