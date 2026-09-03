import { AUDIO_CUE } from './audioCues.js';

const CUE_PROFILES = {
  [AUDIO_CUE.dash]: { wave: 'sawtooth', from: 520, to: 150, duration: 0.11, gain: 0.055, throttle: 0.08 },
  [AUDIO_CUE.enemyAttack]: { wave: 'triangle', from: 178, to: 118, duration: 0.13, gain: 0.032, throttle: 0.18 },
  [AUDIO_CUE.weaponCast]: { wave: 'triangle', from: 620, to: 310, duration: 0.075, gain: 0.026, throttle: 0.065 },
  [AUDIO_CUE.playerHit]: { wave: 'square', from: 130, to: 58, duration: 0.16, gain: 0.08, throttle: 0.12 },
  [AUDIO_CUE.enemyDefeat]: { wave: 'triangle', from: 330, to: 170, duration: 0.09, gain: 0.035, throttle: 0.055 },
  [AUDIO_CUE.eliteDefeat]: { wave: 'sawtooth', from: 190, to: 72, duration: 0.24, gain: 0.07, throttle: 0.16 },
  [AUDIO_CUE.bossDefeat]: { wave: 'square', from: 105, to: 42, duration: 0.42, gain: 0.09, throttle: 0.5 },
  [AUDIO_CUE.eliteWarning]: { wave: 'triangle', from: 220, to: 150, duration: 0.22, gain: 0.055, throttle: 0.5 },
  [AUDIO_CUE.bossWarning]: { wave: 'sawtooth', from: 92, to: 62, duration: 0.36, gain: 0.075, throttle: 0.8 },
  [AUDIO_CUE.phaseShift]: { notes: [196, 294, 392], duration: 0.16, gap: 0.075, gain: 0.045, throttle: 1 },
  [AUDIO_CUE.levelUp]: { notes: [392, 523, 659], duration: 0.12, gap: 0.065, gain: 0.05, throttle: 0.3 },
  [AUDIO_CUE.upgradeSelect]: { notes: [440, 660], duration: 0.1, gap: 0.055, gain: 0.04, throttle: 0.12 }
};

const WEAPON_VARIANT_PROFILES = Object.freeze({
  orb: Object.freeze({ wave: 'triangle', pitch: 1, durationScale: 0.82, gainScale: 0.92 }),
  storm: Object.freeze({ wave: 'sawtooth', pitch: 0.62, durationScale: 1.55, gainScale: 1.14 }),
  lightning: Object.freeze({ wave: 'square', pitch: 1.34, durationScale: 0.68, gainScale: 0.82 }),
  nova: Object.freeze({ wave: 'sine', pitch: 0.48, durationScale: 2.25, gainScale: 1.28 })
});

export function createGameAudioEngine({ contextFactory = createBrowserAudioContext } = {}) {
  let context = null;
  let masterGain = null;
  let muted = false;
  let unlocked = false;
  let lastCue = null;
  let received = 0;
  let played = 0;
  const lastPlayedAt = new Map();

  const ensureContext = () => {
    if (context) return context;
    context = contextFactory?.() ?? null;
    if (!context) return null;
    masterGain = context.createGain();
    masterGain.gain.value = muted ? 0 : 0.78;
    masterGain.connect(context.destination);
    return context;
  };

  const unlock = async () => {
    const nextContext = ensureContext();
    if (!nextContext) return false;
    try {
      if (nextContext.state === 'suspended') await nextContext.resume();
      unlocked = nextContext.state === 'running';
      return unlocked;
    } catch {
      return false;
    }
  };

  const play = event => {
    received += 1;
    lastCue = event.cue;
    const profile = CUE_PROFILES[event.cue];
    if (!profile || muted || !unlocked || !context || !masterGain) return false;

    const now = context.currentTime;
    const previous = lastPlayedAt.get(event.cue) ?? -Infinity;
    if (now - previous < profile.throttle) return false;
    lastPlayedAt.set(event.cue, now);
    const intensity = 0.5 + event.intensity * 0.5;

    if (profile.notes) {
      profile.notes.forEach((frequency, index) => {
        scheduleTone(context, masterGain, {
          wave: 'sine',
          from: frequency,
          to: frequency * 1.02,
          start: now + index * profile.gap,
          duration: profile.duration,
          gain: profile.gain * intensity
        });
      });
    } else {
      const variant = getVariantProfile(event.variant);
      scheduleTone(context, masterGain, {
        ...profile,
        wave: variant.wave ?? profile.wave,
        from: profile.from * variant.pitch,
        to: profile.to * variant.pitch,
        start: now,
        duration: profile.duration * variant.durationScale,
        gain: profile.gain * intensity * variant.gainScale
      });
    }
    played += 1;
    return true;
  };

  const setMuted = nextMuted => {
    muted = Boolean(nextMuted);
    if (masterGain && context) {
      masterGain.gain.setTargetAtTime(muted ? 0 : 0.78, context.currentTime, 0.015);
    }
  };

  const destroy = () => {
    unlocked = false;
    const closing = context?.close?.();
    context = null;
    masterGain = null;
    return closing;
  };

  const getState = () => ({
    supported: Boolean(context || canCreateBrowserAudioContext()),
    unlocked,
    muted,
    received,
    played,
    lastCue
  });

  return { unlock, play, setMuted, destroy, getState };
}

function getVariantProfile(variant) {
  return WEAPON_VARIANT_PROFILES[variant] ?? {
    pitch: 1,
    durationScale: 1,
    gainScale: 1
  };
}

function scheduleTone(context, output, { wave, from, to, start, duration, gain }) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(from, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope);
  envelope.connect(output);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function canCreateBrowserAudioContext() {
  return typeof globalThis !== 'undefined'
    && Boolean(globalThis.AudioContext || globalThis.webkitAudioContext);
}

function createBrowserAudioContext() {
  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
  return AudioContext ? new AudioContext() : null;
}
