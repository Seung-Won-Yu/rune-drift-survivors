const DEFAULT_PROFILE = {
  ringSegments: null,
  ringExpansion: 1.7,
  ringThickness: [0.32, 0.38],
  shardBonus: 0,
  shardDistance: 0.88,
  showEcho: false,
  coreShape: 'octahedron'
};

const HIT_BURST_PROFILES = {
  dash: {
    ringSegments: 4,
    ringExpansion: 2.1,
    ringThickness: [0.22, 0.31],
    shardBonus: 2,
    shardDistance: 1.08,
    showEcho: true,
    coreShape: 'diamond'
  },
  playerHit: {
    ringSegments: 8,
    ringExpansion: 1.46,
    ringThickness: [0.26, 0.42],
    shardBonus: 4,
    shardDistance: 1.16,
    showEcho: true,
    coreShape: 'diamond'
  },
  death: {
    ringSegments: 6,
    ringExpansion: 1.34,
    ringThickness: [0.24, 0.36],
    shardBonus: 3,
    shardDistance: 1.24,
    showEcho: false,
    coreShape: 'diamond'
  },
  eliteDeath: {
    ringSegments: 6,
    ringExpansion: 1.62,
    ringThickness: [0.2, 0.4],
    shardBonus: 5,
    shardDistance: 1.42,
    showEcho: true,
    coreShape: 'diamond'
  },
  bossDeath: {
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
