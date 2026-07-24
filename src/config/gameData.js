export const FIELD_ITEM_META = {
  magnet: { color: '#58b9d4', label: 'MAGNET', name: '자석 룬' },
  purge: { color: '#d8ad4f', label: 'PURGE', name: '정화 폭발' },
  heal: { color: '#8eea8b', label: 'HEAL', name: '생명 결정' },
  overload: { color: '#cf9cff', label: 'OVERLOAD', name: '과부하 룬' },
  cache: { color: '#d4a84c', label: 'ARMORY', name: '무기 보급' }
};

export const ART_TOKENS = {
  void: '#06100e',
  deepVoid: '#0b1815',
  terrainLow: '#162923',
  terrainMid: '#294239',
  terrainHigh: '#56645a',
  moss: '#2f5b4d',
  oldStone: '#65736b',
  wornGold: '#b58a45',
  emberGold: '#e2ad58',
  runeCyan: '#75ddd2',
  runeMint: '#77c8a4',
  dangerRed: '#e06b5f',
  elderViolet: '#aa91cf',
  riftViolet: '#8274c5'
};

export const WAVE_PROFILES = [
  { name: 'Rift Scouts', trait: '정찰', hint: '균형형 진입', accent: '#64c98d', affix: 'scout', targetBase: 48, spawnBase: 7, runner: 0.16, brute: 0.02, interval: 0.58 },
  { name: 'Howling Pack', trait: '추격', hint: '러너 가속', accent: '#58b9d4', affix: 'pack', targetBase: 66, spawnBase: 9, runner: 0.31, brute: 0.05, interval: 0.48 },
  { name: 'Stone March', trait: '장갑', hint: '체력 높은 행군', accent: '#d4a84c', affix: 'stone', targetBase: 80, spawnBase: 10, runner: 0.18, brute: 0.2, interval: 0.44 },
  { name: 'Split Swarm', trait: '분열', hint: '일부 적 사망 시 분열', accent: '#aa91cf', affix: 'split', targetBase: 94, spawnBase: 12, runner: 0.38, brute: 0.14, interval: 0.4 },
  { name: 'Rift Siege', trait: '공성', hint: '피해와 압박 증가', accent: '#d96d58', affix: 'siege', targetBase: 112, spawnBase: 14, runner: 0.3, brute: 0.28, interval: 0.36 }
];

export const BOSS_WAVE_SCHEDULE = [6, 9, 12];

export const COMBAT_RHYTHM = [
  { until: 35, label: '학습', target: 0.76, spawn: 0.78, hp: 0.86, move: 0.92, damage: 0.9, ability: 1.08 },
  { until: 85, label: '정착', target: 0.9, spawn: 0.92, hp: 0.94, move: 0.98, damage: 0.96, ability: 1.02 },
  { until: 145, label: '검증', target: 1.02, spawn: 1.04, hp: 1.02, move: 1.04, damage: 1.04, ability: 0.94 },
  { until: 210, label: '압박', target: 1.14, spawn: 1.16, hp: 1.08, move: 1.12, damage: 1.12, ability: 0.84 },
  { until: Infinity, label: '붕괴', target: 1.26, spawn: 1.28, hp: 1.14, move: 1.2, damage: 1.24, ability: 0.72 }
];

export const EARLY_FIELD_ITEM_SCHEDULE = [
  { id: 'starter-magnet', time: 5, type: 'magnet', distance: 2.2, spread: 1.1 },
  { id: 'starter-cache', time: 42, type: 'cache', distance: 5.2, spread: 1.8 },
  { id: 'second-magnet', time: 54, type: 'magnet', distance: 5.8, spread: 2.4 },
  { id: 'starter-overload', time: 76, type: 'overload', distance: 6.4, spread: 2.6 },
  { id: 'starter-purge', time: 98, type: 'purge', distance: 7.4, spread: 2.9 },
  { id: 'third-magnet', time: 118, type: 'magnet', distance: 8.4, spread: 3.5 },
  { id: 'second-cache', time: 188, type: 'cache', distance: 9.2, spread: 3.8 },
  { id: 'second-purge', time: 208, type: 'purge', distance: 10.5, spread: 4.4 },
  { id: 'third-cache', time: 244, type: 'cache', distance: 10.8, spread: 4.6 },
  { id: 'second-overload', time: 262, type: 'overload', distance: 11.2, spread: 4.8 },
  { id: 'final-cache', time: 286, type: 'cache', distance: 12.0, spread: 5.2 }
];

export const ELITE_ROLE_META = {
  bulwark: { label: 'BULWARK', name: '방벽 정예', color: '#d4a84c', hint: '칼날/태양' },
  charger: { label: 'CHARGER', name: '돌진 정예', color: '#58b9d4', hint: '폭풍/번개' },
  summoner: { label: 'SUMMONER', name: '소환 정예', color: '#aa91cf', hint: '분열/연쇄' }
};

export const BOSS_PATTERN_META = {
  shockwave: { label: 'SHOCKWAVE', color: '#d96d58', hint: '충격파 예고', cue: '붉은 원 밖으로', shape: 'shockwave' },
  summon: { label: 'SUMMON', color: '#aa91cf', hint: '소환수 진입', cue: '보스 주변 정리', shape: 'summon' },
  guard: { label: 'WARD', color: '#d4a84c', hint: '보호막 충전', cue: '보호막 집중 공격', shape: 'guard' }
};

export const BOSS_PATTERN_ORDER = ['shockwave', 'summon', 'guard'];

export const SURGE_EVENTS = [
  { time: 150, label: 'RIFT SURGE', message: '균열 폭주: 적 무리 진입', color: '#d96d58', count: 10 },
  { time: 195, label: 'ELITE SURGE', message: '정예 파동: 패턴 가속', color: '#aa91cf', count: 13 },
  { time: 245, label: 'FINAL SURGE', message: '최종 폭주: 생존 압박 최대', color: '#d4a84c', count: 16 }
];

export const RUN_PHASES = [
  {
    id: 'learn',
    until: 45,
    label: 'LEARN',
    title: '움직임 적응',
    goal: '원을 그리며 XP 회수',
    cardCue: '초반 안정과 XP 흐름',
    color: '#64c98d'
  },
  {
    id: 'anchor',
    until: 115,
    label: 'ANCHOR',
    title: '성장 안정',
    goal: '레벨과 생존 기반 확보',
    cardCue: '기본 구체와 성장 보강',
    color: '#58b9d4'
  },
  {
    id: 'armory',
    until: 170,
    label: 'ARMORY',
    title: '무기 방향',
    goal: '첫 보급으로 빌드 축 선택',
    cardCue: '새 무기 또는 주력 강화',
    color: '#d4a84c'
  },
  {
    id: 'synergy',
    until: 235,
    label: 'SYNERGY',
    title: '조합 완성',
    goal: '주력 무기 공명 만들기',
    cardCue: '공명 완성과 주력 집중',
    color: '#aa91cf'
  },
  {
    id: 'final',
    until: Infinity,
    label: 'FINAL',
    title: '최종 생존',
    goal: '빈 공간 유지와 보스 대응',
    cardCue: '생존 보강과 광역 정리',
    color: '#d96d58'
  }
];

export const SHRINE_SITES = [
  { id: 'armory', angle: 0.72, radius: 82, reward: 'cache', label: '무기 제단', color: '#d4a84c' },
  { id: 'vital', angle: 2.62, radius: 89.5, reward: 'heal', label: '생명 제단', color: '#79f29a' },
  { id: 'purge', angle: 4.08, radius: 82, reward: 'purge', label: '정화 제단', color: '#d8ad4f' },
  { id: 'etching', angle: 5.45, radius: 89.5, reward: 'upgrade', label: '각인 제단', color: '#aa91cf' }
];

export const MAP_CLIFFS = [
  { x: -42, z: -18, w: 14, d: 4.8, h: 0.86, color: '#596350' },
  { x: 34, z: 24, w: 13, d: 5.2, h: 0.94, color: '#62694f' },
  { x: -10, z: 61, w: 18, d: 4.6, h: 0.82, color: '#515d4d' },
  { x: 62, z: -37, w: 15, d: 5.4, h: 0.9, color: '#58634f' },
  { x: -74, z: 42, w: 13, d: 4.9, h: 0.78, color: '#4d5c4c' },
  { x: 20, z: -73, w: 18, d: 4.6, h: 0.84, color: '#5e664f' },
  { x: 80, z: 18, w: 12, d: 4.4, h: 0.72, color: '#59624f' },
  { x: -80, z: -44, w: 14, d: 5.1, h: 0.82, color: '#4d5a4c' }
];

export const WEAPON_CATALOG = [
  {
    id: 'rune-orb',
    name: '룬 구체',
    color: '#58b9d4',
    cooldown: 0.5,
    damage: 23,
    speed: 17,
    pierce: 1,
    size: 0.34
  },
  {
    id: 'storm-brand',
    name: '폭풍 낙인',
    color: '#7fc9d8',
    cooldown: 1.68,
    damage: 34,
    speed: 0,
    pierce: 5,
    size: 0.44
  },
  {
    id: 'orbit-blade',
    name: '궤도 칼날',
    color: '#d4a84c',
    cooldown: 0,
    damage: 14,
    speed: 0,
    pierce: 99,
    size: 0.22
  },
  {
    id: 'chain-lightning',
    name: '연쇄 번개',
    color: '#aa91cf',
    cooldown: 1.16,
    damage: 25,
    range: 34,
    chains: 3
  },
  {
    id: 'solar-nova',
    name: '태양 파동',
    color: '#d96d58',
    cooldown: 3.35,
    damage: 31,
    radius: 8.4
  }
];

export const DAMAGE_SOURCE_META = {
  orb: { label: '룬 구체', color: '#58b9d4' },
  storm: { label: '폭풍 낙인', color: '#7fc9d8' },
  blade: { label: '궤도 칼날', color: '#d4a84c' },
  lightning: { label: '연쇄 번개', color: '#aa91cf' },
  nova: { label: '태양 파동', color: '#d96d58' },
  generic: { label: '기타', color: '#d4a84c' }
};
