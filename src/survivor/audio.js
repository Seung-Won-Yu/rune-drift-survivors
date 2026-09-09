// Short synthesized cues keep the game self-contained. No media requests or autoplay.
export function createAudio() {
  let context = null,
    lastVoice = -1;
  const lastEvent = new Map();
  function unlock() {
    try {
      context ??= new (window.AudioContext || window.webkitAudioContext)();
      if (context.state === 'suspended') context.resume().catch(() => {});
      return true;
    } catch {
      return false;
    }
  }
  function note(hz, end, type, time, duration, volume) {
    const voice = context.createOscillator(),
      gain = context.createGain();
    voice.type = type;
    voice.frequency.setValueAtTime(hz, time);
    voice.frequency.exponentialRampToValueAtTime(end, time + duration);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    voice.connect(gain).connect(context.destination);
    voice.start(time);
    voice.stop(time + duration + .01);
    voice.onended = () => {
      voice.disconnect();
      gain.disconnect();
    };
  }
  function play(event, variant) {
    if (context?.state !== 'running') return;
    const now = context.currentTime,
      cooldown = ['xp', 'kill', 'rune-hit'].includes(event) ? .16 : .06;
    if (now - lastVoice < .045 || now - (lastEvent.get(event) ?? -1) < cooldown) return;
    lastVoice = now;
    lastEvent.set(event, now);
    if (event === 'blade-impact') {
      note(125, 48, 'triangle', now, .12, .03);
      note(1550, 520, 'sine', now, .045, .014);
    } else if (event === 'ember-impact') {
      note(95, 36, 'triangle', now, .2, .035);
      note(240, 70, 'sine', now, .16, .024);
    } else if (event === 'fire-spread') {
      note(380, 790, 'sine', now, .1, .016);
    } else if (event === 'swing') {
      note(variant === 'duelist' ? 180 : 310, 65, 'triangle', now, variant === 'sweep' ? .14 : .09, .032);
      note(1000, 210, 'sine', now, .045, .012);
    } else if (event === 'ember-shot') {
      note(variant === 'detonation' ? 130 : 240, variant === 'wildfire' ? 420 : 720, 'sine', now, variant === 'detonation' ? .15 : .09, .023);
      note(150, 75, 'triangle', now + .025, .09, .018);
    } else if (event === 'rune-hit' || event === 'pulse') {
      note(variant === 'bulwark' ? 390 : variant === 'horizon' ? 660 : 520, variant === 'horizon' ? 880 : 490, 'sine', now, .18, .022);
      note(780, 735, 'sine', now + .03, .18, .012);
    } else if (event === 'heal' || event === 'level' || event === 'evolve' || event === 'boss-defeated') {
      const base = event === 'heal' ? 440 : event === 'boss-defeated' ? 330 : 550;
      [1, 1.25, 1.5].forEach((ratio, i) => note(base * ratio, base * ratio, 'sine', now + i * .07, .2, .023));
    } else {
      const hz = {
        xp: 760,
        kill: 230,
        choose: 880,
        hurt: 100,
        elite: 120,
        warning: 200,
        slam: 70,
        'boss-arrival': 95,
        'boss-warning': 220,
        'boss-charge': 75,
        'boss-thorns': 380
      }[event] ?? 300;
      note(hz, event === 'xp' ? hz * 1.2 : hz * .55, event === 'hurt' ? 'triangle' : 'sine', now, event === 'hurt' ? .15 : .1, event === 'hurt' ? .045 : .02);
    }
  }
  // Existing tails are brief; suspend immediately when muting or leaving the page.
  function suspend() {
    if (context?.state === 'running') context.suspend().catch(() => {});
  }
  return {
    unlock,
    play,
    suspend,
    state: () => context?.state ?? 'uninitialized'
  };
}
