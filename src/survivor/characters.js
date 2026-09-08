export const CHARACTERS = {
  ash: {
    id: 'ash',
    name: '잿빛 검사',
    title: '검으로 길을 여는 균형형',
    weapon: 'sword',
    hp: 100,
    speed: 168,
    armor: 0,
    trait: '체력 100 · 이동 168',
    color: '#e9bd78',
    art: 'hero-ash.png',
    unlock: '처음부터 함께합니다',
    description: '넓게 베는 황동 검으로 시작합니다. 검격을 진화시켜 무리를 관통하세요.'
  },
  ember: {
    id: 'ember',
    name: '불씨술사',
    title: '거리를 지키는 원거리형',
    weapon: 'ember',
    hp: 85,
    speed: 184,
    armor: 0,
    trait: '체력 85 · 이동 184',
    color: '#efab83',
    art: 'hero-ember.png',
    unlock: '한 판에서 60초 생존',
    description: '빠른 발걸음과 추적 불씨로 시작합니다. 거리를 벌리고 폭발로 무리를 정리하세요.'
  },
  grove: {
    id: 'grove',
    name: '룬 수호자',
    title: '접근을 버티는 근접 방어형',
    weapon: 'orbit',
    hp: 125,
    speed: 156,
    armor: .15,
    trait: '회전 룬 +1 · 받는 피해 −15%',
    color: '#a2d5c6',
    art: 'hero-grove.png',
    unlock: '누적 200마리 처치',
    description: '체력 125와 두 개의 회전 룬으로 시작합니다. 적의 예고를 피하며 가까운 공간을 지키세요.'
  }
};
export const getCharacter = id => Object.hasOwn(CHARACTERS, id) ? CHARACTERS[id] : CHARACTERS.ash;
export function isUnlocked(profile, id) {
  return id === 'ash' || id === 'ember' && profile.bestTime >= 60 || id === 'grove' && profile.totalKills >= 200;
}
export function unlockProgress(profile, id) {
  if (isUnlocked(profile, id)) return '함께할 수 있습니다';
  return id === 'ember' ? `최장 생존 ${Math.floor(profile.bestTime)} / 60초` : `누적 처치 ${Math.min(200, profile.totalKills)} / 200`;
}
