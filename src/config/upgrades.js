export const upgradePool = [
  { id: 'orb-count', family: '룬 구체', branch: '분열', title: '룬 구체 분열', text: '룬 구체 발사 수 +1', apply: stats => ({ ...stats, orbCount: Math.min(7, stats.orbCount + 1) }) },
  { id: 'orb-fan', family: '룬 구체', branch: '분열', title: '분열 룬진', text: '구체 +2, 구체 피해 -6%', apply: stats => ({ ...stats, orbCount: Math.min(8, stats.orbCount + 2), orbDamage: stats.orbDamage * 0.94 }) },
  { id: 'orb-lance', family: '룬 구체', branch: '관통', title: '관통 룬창', text: '구체 피해/크기/관통 증가', apply: stats => ({ ...stats, orbDamage: stats.orbDamage * 1.32, orbScale: stats.orbScale * 1.16, orbSpeed: stats.orbSpeed * 1.08, pierce: stats.pierce + 1 }) },
  { id: 'storm-burst', family: '폭풍 낙인', branch: '광역', title: '폭풍 낙인 증폭', text: '폭풍 범위 +18%', apply: stats => ({ ...stats, stormRadius: stats.stormRadius * 1.18, stormDamage: stats.stormDamage * 1.08 }) },
  { id: 'storm-volley', family: '폭풍 낙인', branch: '난사', title: '낙뢰 난사', text: '폭풍 낙뢰 +1, 쿨다운 소폭 감소', apply: stats => ({ ...stats, stormStrikes: Math.min(4, stats.stormStrikes + 1), stormCooldown: stats.stormCooldown * 0.94 }) },
  { id: 'storm-carpet', family: '폭풍 낙인', branch: '장판', title: '잔류 폭풍', text: '폭풍 지속/범위 증가', apply: stats => ({ ...stats, stormDuration: stats.stormDuration * 1.3, stormRadius: stats.stormRadius * 1.14, stormDamage: stats.stormDamage * 1.05 }) },
  { id: 'blade-plus', family: '궤도 칼날', branch: '수호', title: '칼날 궤도 확장', text: '궤도 칼날 +1', apply: stats => ({ ...stats, bladeBonus: Math.min(5, stats.bladeBonus + 1) }) },
  { id: 'blade-guard', family: '궤도 칼날', branch: '수호', title: '수호 칼날환', text: '칼날 +2, 근접 방어 강화', apply: stats => ({ ...stats, bladeBonus: Math.min(6, stats.bladeBonus + 2), bladeRadius: stats.bladeRadius * 0.92, bladeDamage: stats.bladeDamage * 1.08 }) },
  { id: 'blade-reaper', family: '궤도 칼날', branch: '참격', title: '사신 궤도', text: '칼날 피해/범위 증가', apply: stats => ({ ...stats, bladeDamage: stats.bladeDamage * 1.34, bladeRadius: stats.bladeRadius * 1.18 }) },
  { id: 'chain-plus', family: '연쇄 번개', branch: '연쇄', title: '연쇄 번개 도약', text: '번개 연쇄 +1', apply: stats => ({ ...stats, lightningChains: Math.min(9, stats.lightningChains + 1), lightningDamage: stats.lightningDamage * 1.08 }) },
  { id: 'chain-web', family: '연쇄 번개', branch: '망', title: '전류망 확산', text: '연쇄 +3, 사거리 증가', apply: stats => ({ ...stats, lightningChains: Math.min(11, stats.lightningChains + 3), lightningRange: stats.lightningRange * 1.18, lightningDamage: stats.lightningDamage * 0.96 }) },
  { id: 'chain-smite', family: '연쇄 번개', branch: '처형', title: '처형 번개', text: '부상 적에게 번개 피해 증가', apply: stats => ({ ...stats, lightningDamage: stats.lightningDamage * 1.24, lightningExecute: stats.lightningExecute + 1 }) },
  { id: 'nova-plus', family: '태양 파동', branch: '광역', title: '태양 파동 확장', text: '광역 파동 범위 +20%', apply: stats => ({ ...stats, novaRadius: stats.novaRadius * 1.2, novaDamage: stats.novaDamage * 1.08 }) },
  { id: 'nova-pulse', family: '태양 파동', branch: '연타', title: '쌍파동 공명', text: '파동 쿨다운 감소, 피해 증가', apply: stats => ({ ...stats, novaPulse: stats.novaPulse + 1, novaCooldown: stats.novaCooldown * 0.86, novaDamage: stats.novaDamage * 1.08 }) },
  { id: 'nova-comet', family: '태양 파동', branch: '폭딜', title: '핵심 태양', text: '파동 피해/범위 크게 증가', apply: stats => ({ ...stats, novaDamage: stats.novaDamage * 1.38, novaRadius: stats.novaRadius * 1.12, novaCooldown: stats.novaCooldown * 1.08 }) },
  { id: 'damage', family: '공용', branch: '화력', title: '각인 강화', text: '모든 피해 +16%', apply: stats => ({ ...stats, damage: stats.damage * 1.16 }) },
  { id: 'speed', family: '생존', branch: '기동', title: '가벼운 발걸음', text: '이동 속도 +12%', apply: stats => ({ ...stats, speed: stats.speed * 1.12 }) },
  { id: 'cooldown', family: '공용', branch: '속도', title: '빠른 영창', text: '공격 간격 -10%', apply: stats => ({ ...stats, cooldown: stats.cooldown * 0.9 }) },
  { id: 'magnet', family: '성장', branch: '흡수', title: '흡인 룬', text: 'XP 흡수 거리 +35%', apply: stats => ({ ...stats, magnet: stats.magnet * 1.35 }) },
  { id: 'dash', family: '생존', branch: '기동', title: '대시 충전', text: '대시 쿨다운 -18%', apply: stats => ({ ...stats, dashCooldown: stats.dashCooldown * 0.82 }) },
  { id: 'maxHp', family: '생존', branch: '방어', title: '수호 석판', text: '최대 체력 +20', apply: stats => ({ ...stats, maxHp: stats.maxHp + 20, hp: Math.min(stats.maxHp + 20, stats.hp + 20) }) },
  { id: 'pierce', family: '룬 구체', branch: '관통', title: '관통 문양', text: '구체 관통 +1', apply: stats => ({ ...stats, pierce: stats.pierce + 1, orbDamage: stats.orbDamage * 1.04 }) },
  { id: 'luck', family: '성장', branch: 'XP', title: '찬란한 룬', text: 'XP 획득량 +18%', apply: stats => ({ ...stats, xpGain: stats.xpGain * 1.18 }) }
];

export const BUILD_FOCUS_META = {
  orb: {
    label: '룬 구체',
    title: '분열 사격',
    color: '#70d6ff',
    glyph: '◈',
    perks: ['표적 +1', '부채꼴 보조탄', '룬창 과충전']
  },
  storm: {
    label: '폭풍 낙인',
    title: '낙뢰 지대',
    color: '#b8f7ff',
    glyph: '↯',
    perks: ['낙뢰 +1', '잔류 시간 증가', '폭풍망 확장']
  },
  blade: {
    label: '궤도 칼날',
    title: '근접 수호',
    color: '#f7d06b',
    glyph: '◇',
    perks: ['칼날 +1', '접촉 피해 감소', '참격 압박']
  },
  chain: {
    label: '연쇄 번개',
    title: '전류 제어',
    color: '#d7b7ff',
    glyph: '⌁',
    perks: ['연쇄 +1', '감전 둔화', '부상 처형']
  },
  nova: {
    label: '태양 파동',
    title: '태양 중심',
    color: '#ff8b72',
    glyph: '☉',
    perks: ['파동 범위 증가', '밀어내기 강화', '쿨다운 압축']
  }
};

export const BUILD_SYNERGIES = [
  {
    id: 'storm-chain',
    title: '폭풍 전류망',
    label: '폭풍 + 번개',
    keys: ['storm', 'chain'],
    color: '#9ff7ff',
    bonus: '낙뢰가 더 자주 감전시키고 번개 사거리가 증가'
  },
  {
    id: 'blade-nova',
    title: '태양 칼날환',
    label: '칼날 + 태양',
    keys: ['blade', 'nova'],
    color: '#fff1a6',
    bonus: '근접 방어와 파동 밀어내기가 함께 강화'
  },
  {
    id: 'orb-pierce',
    title: '관통 룬창',
    label: '구체 관통',
    keys: ['orb'],
    color: '#70d6ff',
    bonus: '구체 관통/속도/피해가 집중 성장'
  }
];

export const UPGRADE_RANK_LIMITS = {
  'orb-lance': 4,
  'storm-burst': 4,
  'storm-carpet': 4,
  'blade-reaper': 4,
  'chain-smite': 4,
  'nova-plus': 4,
  'nova-pulse': 4,
  'nova-comet': 4,
  damage: 5,
  cooldown: 5,
  speed: 4,
  magnet: 4,
  dash: 4,
  maxHp: 4,
  pierce: 3,
  luck: 4
};

export const WEAPON_UPGRADE_IDS = new Set([
  'orb-count',
  'orb-fan',
  'orb-lance',
  'storm-burst',
  'storm-volley',
  'storm-carpet',
  'blade-plus',
  'blade-guard',
  'blade-reaper',
  'chain-plus',
  'chain-web',
  'chain-smite',
  'nova-plus',
  'nova-pulse',
  'nova-comet',
  'pierce',
  'cooldown',
  'damage'
]);
