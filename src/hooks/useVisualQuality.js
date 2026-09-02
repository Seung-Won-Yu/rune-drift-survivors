import { useCallback, useEffect, useState } from 'react';
import {
  BALANCED_STATE_SYNC_INTERVAL,
  LOW_STATE_SYNC_INTERVAL,
  STATE_SYNC_INTERVAL,
  VISUAL_BUDGETS
} from '../config/gameTuning.js';

const VISUAL_QUALITY_VALUES = new Set(['low', 'balanced', 'high']);
const VISUAL_QUALITY_MODES = new Set(['auto', ...VISUAL_QUALITY_VALUES]);
const QUALITY_MODE_STORAGE_KEY = 'rune-drift-quality-mode';
const LEGACY_QUALITY_STORAGE_KEY = 'rune-drift-quality';

export function getVisualBudget(visualQuality = 'high') {
  return VISUAL_BUDGETS[visualQuality] ?? VISUAL_BUDGETS.high;
}

export function getRuntimeVisualQuality(baseQuality = 'balanced', game = {}) {
  if (baseQuality === 'low') return 'low';
  if (isVisualQualityForced()) return baseQuality;
  const time = game.time ?? 0;
  const wave = game.wave ?? 1;
  const kills = game.kills ?? 0;
  const severePressure = time >= 145 || wave >= 8 || kills >= 280 || Boolean(game.bossStatus?.enraged && time >= 120);
  if (severePressure) return 'balanced';
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

function getQueryVisualQuality() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const queryQuality = params.get('quality')?.toLowerCase();
  if (queryQuality === 'cinematic') return 'high';
  if (VISUAL_QUALITY_VALUES.has(queryQuality)) return queryQuality;
  return null;
}

function getSavedQualityMode() {
  if (typeof window === 'undefined') return 'auto';
  try {
    const savedMode = window.localStorage?.getItem(QUALITY_MODE_STORAGE_KEY)?.toLowerCase();
    if (VISUAL_QUALITY_MODES.has(savedMode)) return savedMode;
    const legacyQuality = window.localStorage?.getItem(LEGACY_QUALITY_STORAGE_KEY)?.toLowerCase();
    return VISUAL_QUALITY_VALUES.has(legacyQuality) ? legacyQuality : 'auto';
  } catch {
    return 'auto';
  }
}

function isVisualQualityForced() {
  return getQueryVisualQuality() !== null || getSavedQualityMode() !== 'auto';
}

export function isOptionalRenderFeatureEnabled(name) {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get(name) === 'on' || params.get('quality') === 'cinematic';
}

function getAutomaticVisualQuality() {
  if (typeof window === 'undefined') return 'balanced';
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
  const [queryQuality] = useState(() => getQueryVisualQuality());
  const [qualityMode, setQualityModeState] = useState(() => getSavedQualityMode());
  const [automaticQuality, setAutomaticQuality] = useState(() => getAutomaticVisualQuality());

  useEffect(() => {
    const update = () => setAutomaticQuality(getAutomaticVisualQuality());
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    window.addEventListener('resize', update);
    reducedMotion?.addEventListener?.('change', update);
    return () => {
      window.removeEventListener('resize', update);
      reducedMotion?.removeEventListener?.('change', update);
    };
  }, []);

  const setQualityMode = useCallback(nextMode => {
    if (queryQuality || !VISUAL_QUALITY_MODES.has(nextMode)) return;
    setQualityModeState(nextMode);
    try {
      window.localStorage?.setItem(QUALITY_MODE_STORAGE_KEY, nextMode);
      window.localStorage?.removeItem(LEGACY_QUALITY_STORAGE_KEY);
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }, [queryQuality]);

  return {
    visualQuality: queryQuality ?? (qualityMode === 'auto' ? automaticQuality : qualityMode),
    qualityMode: queryQuality ?? qualityMode,
    setQualityMode,
    qualityLockedByUrl: queryQuality !== null
  };
}
