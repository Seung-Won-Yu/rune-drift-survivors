const IMPORTANT = ['hurt', 'boss-arrival', 'boss-warning', 'boss-charge', 'boss-thorns', 'boss-defeated', 'evolve', 'level', 'heal', 'choose', 'slam', 'warning', 'elite'];
const IMPACTS = ['blade-impact', 'ember-impact', 'rune-hit', 'pulse'];

export function selectAudioEvents(events) {
  const has = event => events.has(event);
  const important = IMPORTANT.find(has);
  const impact = IMPACTS.find(has);
  // One foreground cue plus one contact, never one voice per enemy.
  if (important) return impact ? [important, impact] : [important];
  if (impact) return [impact];
  const other = ['fire-spread', 'ember-shot', 'swing', 'xp', 'kill'].find(has);
  return other ? [other] : [];
}

// Short synthesized cues keep the game self-contained. No media requests or autoplay.
export function createAudio() {
  let context = null, noiseBuffer = null;
  const lastLane = new Map();
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
  function transient(time, duration, volume, frequency) {
    // Reuse a small deterministic noise texture; no combat RNG or media download.
    if (!noiseBuffer) {
      noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * .2), context.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = (Math.sin(i * 127.1 + 19.7) * 43758.5453 % 1);
    }
    const voice = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    voice.buffer = noiseBuffer;
    filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = .7;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    voice.connect(filter).connect(gain).connect(context.destination);
    voice.start(time); voice.stop(time + duration);
    voice.onended = () => { voice.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  function play(event, variant) {
    if (context?.state !== 'running') return;
    const now = context.currentTime;
    const lane = IMPACTS.includes(event) ? 'impact' : IMPORTANT.includes(event) ? 'important' : 'background';
    const cooldown = lane === 'impact' ? .085 : ['xp', 'kill'].includes(event) ? .16 : .06;
    if (now - (lastLane.get(lane) ?? -1) < (lane === 'impact' ? .085 : .045) || now - (lastEvent.get(event) ?? -1) < cooldown) return;
    lastLane.set(lane, now);
    lastEvent.set(event, now);
    if (event === 'blade-impact') {
      note(150, 48, 'triangle', now, .12, .045);
      note(1650, 520, 'sine', now, .045, .016);
      transient(now, .055, .075, 2100);
    } else if (event === 'ember-impact') {
      note(95, 36, 'triangle', now, .2, .035);
      note(240, 70, 'sine', now, .16, .024);
      transient(now, .11, .065, 650);
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
      note(120, 60, 'triangle', now, .065, .026);
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
