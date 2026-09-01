const DEFAULT_PROFILE = {
  ringSegments: null,
  ringExpansion: 1.7,
  ringThickness: [0.32, 0.38],
  ringRotation: 0,
  shardBonus: 0,
  shardQualityScale: 1,
  shardDistance: 0.88,
  shardLength: 1,
  shardWidth: 1,
  shardShape: 'spike',
  showEcho: false,
  coreShape: 'octahedron',
  coreScale: 1
};

const HIT_BURST_PROFILES = {
  orb: {
    ...DEFAULT_PROFILE,
    ringSegments: 4,
    ringExpansion: 1.18,
    ringThickness: [0.18, 0.3],
    ringRotation: Math.PI / 4,
    shardBonus: 1,
    shardDistance: 1.12,
    coreScale: 0.92
  },
  storm: {
    ...DEFAULT_PROFILE,
    ringSegments: 12,
    ringExpansion: 0.92,
    ringThickness: [0.46, 0.58],
    shardBonus: 4,
    shardDistance: 1.42,
    shardLength: 1.38,
    shardWidth: 0.72,
    showEcho: true,
    coreShape: 'diamond',
    coreScale: 1.14
  },
  blade: {
    ...DEFAULT_PROFILE,
    ringSegments: 4,
    ringExpansion: 0.66,
    ringThickness: [0.08, 0.18],
    ringRotation: Math.PI / 4,
    shardBonus: 6,
    shardDistance: 1.36,
    shardLength: 2.35,
    shardWidth: 0.52,
    shardShape: 'slash',
    coreShape: 'diamond',
    coreScale: 0.78
  },
  lightning: {
    ...DEFAULT_PROFILE,
    ringSegments: 6,
    ringExpansion: 1.08,
    ringThickness: [0.12, 0.24],
    ringRotation: Math.PI / 6,
    shardBonus: 3,
    shardDistance: 1.5,
    shardLength: 1.55,
    shardWidth: 0.62,
    showEcho: true,
    coreShape: 'diamond',
    coreScale: 0.86
  },
  nova: {
    ...DEFAULT_PROFILE,
    ringSegments: 48,
    ringExpansion: 0.7,
    ringThickness: [0.74, 0.88],
    shardQualityScale: 0,
    showEcho: true,
    coreShape: 'sphere',
    coreScale: 1.45
  },
  dash: {
    ...DEFAULT_PROFILE,
    ringSegments: 4,
    ringExpansion: 2.1,
    ringThickness: [0.22, 0.31],
    shardBonus: 2,
    shardDistance: 1.08,
    showEcho: true,
    coreShape: 'diamond'
  },
  playerHit: {
    ...DEFAULT_PROFILE,
    ringSegments: 8,
    ringExpansion: 1.46,
    ringThickness: [0.26, 0.42],
    shardBonus: 4,
    shardDistance: 1.16,
    showEcho: true,
    coreShape: 'diamond'
  },
  death: {
    ...DEFAULT_PROFILE,
    ringSegments: 6,
    ringExpansion: 1.34,
    ringThickness: [0.24, 0.36],
    shardBonus: 3,
    shardDistance: 1.24,
    showEcho: false,
    coreShape: 'diamond'
  },
  eliteDeath: {
    ...DEFAULT_PROFILE,
    ringSegments: 6,
    ringExpansion: 1.62,
    ringThickness: [0.2, 0.4],
    shardBonus: 5,
    shardDistance: 1.42,
    showEcho: true,
    coreShape: 'diamond'
  },
  bossDeath: {
    ...DEFAULT_PROFILE,
    ringSegments: 8,
    ringExpansion: 1.92,
    ringThickness: [0.18, 0.42],
    shardBonus: 7,
    shardDistance: 1.58,
    showEcho: true,
    coreShape: 'diamond'
  }
};

export function getHitBurstPresentation(type) {
  return HIT_BURST_PROFILES[type] ?? DEFAULT_PROFILE;
}
