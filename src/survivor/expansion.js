// Stable IDs are shared by gameplay, cards, and saved discovery records.
export const SPECIALIZATIONS = {
  sweep: {
    weapon: 'sword',
    name: '반월 검법',
    icon: 'sword',
    color: '#f5d78f',
    description: '넓은 반원을 베어 무리를 정리합니다. 한 번의 피해는 줄어듭니다.',
    change: '검 범위 +26 · 각도 확대 · 피해 ×0.8'
  },
  duelist: {
    weapon: 'sword',
    name: '일점 검법',
    icon: 'sword',
    color: '#f4ac91',
    description: '좁은 방향에 힘을 모아 강한 적을 베어냅니다.',
    change: '검 각도 축소 · 피해 ×1.65 · 재사용 +0.12초'
  },
  wildfire: {
    weapon: 'ember',
    name: '번지는 불꽃',
    icon: 'ember',
    color: '#ffaa65',
    description: '적을 3초간 태웁니다. 불타는 적이 쓰러지면 주변의 불붙지 않은 적 둘에게 불이 옮겨갑니다.',
    change: '직격 피해 ×0.7 · 초당 12 연소 · 진화 시 연소 강화'
  },
  detonation: {
    weapon: 'ember',
    name: '응축 화염',
    icon: 'ember',
    color: '#ffd3a0',
    description: '느리게 모은 불씨가 큰 폭발로 주변 적을 공격합니다.',
    change: '반경 72 폭발 · 피해 ×1.15 · 발사 간격 1.25초'
  },
  bulwark: {
    weapon: 'orbit',
    name: '수호 결계',
    icon: 'orbit',
    color: '#94e2b8',
    description: '룬을 몸 가까이 모읍니다. 접근하는 적을 밀어내며 받은 피해를 줄입니다.',
    change: '회전 반경 46 · 밀어내기 ×1.8 · 받은 피해 ×0.85'
  },
  horizon: {
    weapon: 'orbit',
    name: '별자리 궤도',
    icon: 'orbit',
    color: '#a0cfff',
    description: '룬을 멀리 보내 공격합니다. 몸 바로 옆은 비게 됩니다.',
    change: '회전 반경 +48 · 룬 피해 ×1.35'
  }
};
export const RELICS = {
  coal: {
    name: '꺼지지 않는 숯',
    icon: 'ember',
    color: '#ffb077',
    description: '불씨 적중 시 3초 연소. 연소 전문화가 있으면 연소 피해가 50% 증가합니다.',
    change: '연소 초당 8 · 번지는 불꽃과 시너지'
  },
  fang: {
    name: '왕을 노리는 송곳니',
    icon: 'sword',
    color: '#efb4a2',
    description: '검으로 정예와 군주를 더 강하게 공격합니다. 일반 적에게 주는 검 피해는 감소합니다.',
    change: '검: 정예·보스 ×1.4 / 일반 적 ×0.9'
  },
  bell: {
    name: '서리 종',
    icon: 'orbit',
    color: '#a8dcef',
    description: '룬에 맞은 일반 적의 발걸음을 늦춥니다. 군주의 공격 속도는 변하지 않습니다.',
    change: '룬 적중: 일반 적 1.2초간 30% 둔화'
  },
  sail: {
    name: '바람 돛',
    icon: 'fleet',
    color: '#cedda2',
    description: '계속 이동하는 동안 불씨의 발사 준비가 빨라집니다.',
    change: '이동 중 불씨 재사용 시간 35% 빠르게 감소'
  },
  dew: {
    name: '이슬 씨앗',
    icon: 'heart',
    color: '#a6dfa9',
    description: '경험치를 모아 체력을 되찾습니다. 최대 체력일 때 발생한 회복은 저장하지 않습니다.',
    change: '경험치 30 수집마다 체력 3 회복'
  },
  briar: {
    name: '가시 심장',
    icon: 'heart',
    color: '#e4a7c9',
    description: '살아남은 피격 뒤 가시 파동으로 주변 적을 밀어냅니다.',
    change: '반경 110 · 피해 35 · 재사용 6초'
  }
};
export const specializationFor = (game, weapon) => Object.keys(SPECIALIZATIONS).find(key => SPECIALIZATIONS[key].weapon === weapon && game.ranks[key]);
export function specializationOffers(game) {
  if (game.level < 4) return [];
  const weapon = ['sword', 'ember', 'orbit'].find(key => game.ranks[key] >= 3 && !specializationFor(game, key));
  return Object.keys(SPECIALIZATIONS).filter(key => SPECIALIZATIONS[key].weapon === weapon);
}
export function modifyBuildStats(game, s) {
  if (game.ranks.sweep) {
    s.swordRange += 26;
    s.swordHalfAngle = 2.3;
    s.swordDamage *= .8;
  }
  if (game.ranks.duelist) {
    s.swordHalfAngle = .62;
    s.swordDamage *= 1.65;
    s.swordCooldown += .12;
  }
  if (game.ranks.wildfire) s.emberDamage *= .7;
  if (game.ranks.detonation) s.emberDamage *= 1.15;
  if (game.ranks.bulwark) s.orbitRadius = 46;
  if (game.ranks.horizon) {
    s.orbitRadius += 48;
    s.orbitDamage *= 1.35;
  }
  return s;
}
