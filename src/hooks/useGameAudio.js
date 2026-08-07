import { useCallback, useEffect, useRef, useState } from 'react';

import { emitAudioCue, subscribeAudioCues } from '../audio/audioCues.js';
import { createGameAudioEngine } from '../audio/gameAudioEngine.js';

const AUDIO_MUTED_KEY = 'rune-drift-audio-muted';

export function useGameAudio() {
  const engineRef = useRef(null);
  if (!engineRef.current) engineRef.current = createGameAudioEngine();
  const [muted, setMuted] = useState(readStoredMuted);

  useEffect(() => {
    const engine = engineRef.current;
    engine.setMuted(muted);
    storeMuted(muted);
  }, [muted]);

  useEffect(() => subscribeAudioCues(event => {
    engineRef.current.play(event);
  }), []);

  useEffect(() => {
    const unlock = async () => {
      const didUnlock = await engineRef.current.unlock();
      if (!didUnlock) return;
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    return () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    window.__RUNE_DRIFT_AUDIO__ = {
      cue: (cue, detail) => emitAudioCue(cue, detail),
      state: () => engineRef.current.getState()
    };
    return () => {
      delete window.__RUNE_DRIFT_AUDIO__;
    };
  }, []);

  useEffect(() => () => {
    engineRef.current.destroy();
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted(current => !current);
  }, []);

  return { muted, toggleMuted };
}

function readStoredMuted() {
  try {
    return window.localStorage.getItem(AUDIO_MUTED_KEY) === 'true';
  } catch {
    return false;
  }
}

function storeMuted(muted) {
  try {
    window.localStorage.setItem(AUDIO_MUTED_KEY, String(muted));
  } catch {
    // Audio remains usable when storage is unavailable.
  }
}
