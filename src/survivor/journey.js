// One optional starting keepsake; existing weapons and relics remain available.
export const KEEPSAKES = {
  none: { name: '빈손의 여정', change: '기본 능력으로 출발', hp: 0, speed: 0, magnet: 0 },
  seed: { name: '제단의 씨앗', change: '수집 거리 +28 · 최대 체력 −10', hp: -10, speed: 0, magnet: 28 },
  ribbon: { name: '갈림길의 리본', change: '이동 속도 +12 · 최대 체력 −10', hp: -10, speed: 12, magnet: 0 },
  crown: { name: '재의 왕관 조각', change: '최대 체력 +15 · 이동 속도 −8', hp: 15, speed: -8, magnet: 0 },
  bookmark: { name: '첫빛의 책갈피', change: '첫 60초 획득 경험치 +20%', hp: 0, speed: 0, magnet: 0, xpBonus: .2, xpSeconds: 60 }
};
export const CHALLENGES = [
  { id: 'altar', name: '숲의 응답', description: '봉인 제단을 완료한 여정을 마치세요. 쓰러져도 기록됩니다.', target: 1, reward: 'seed' },
  { id: 'branches', name: '두 갈래의 기록', description: '서로 다른 전문화 2개를 여정 기록에 남기세요.', target: 2, reward: 'ribbon' },
  { id: 'sovereign', name: '왕관을 깨뜨린 자', description: '재의 군주를 한 번 격파하세요.', target: 1, reward: 'crown' },
  { id: 'collection', name: '첫 세 장의 기록', description: '서로 다른 전문화·진화·유물 3개를 발견하고 여정을 마치세요.', target: 3, reward: 'bookmark' }
];
export const discoveryCount = profile => (profile.discoveries?.length ?? 0) + (profile.buildDiscoveries?.length ?? 0) + (profile.relicDiscoveries?.length ?? 0);
export function challengeProgress(profile, challenge) {
  const value = { altar: profile.altarRuns ?? 0, branches: profile.buildDiscoveries?.length ?? 0, sovereign: profile.wins ?? 0, collection: discoveryCount(profile) }[challenge.id] ?? 0;
  return Math.min(challenge.target, Math.max(0, value));
}
export const completedChallenges = profile => CHALLENGES.filter(c => challengeProgress(profile, c) >= c.target);
export const canEquipKeepsake = (profile, id) => id === 'none' || completedChallenges(profile).some(c => c.reward === id);
export function keepsakeStats(id) { return Object.hasOwn(KEEPSAKES, id) ? KEEPSAKES[id] : KEEPSAKES.none; }
export function keepsakeXpMultiplier(game) {
  const k = keepsakeStats(game.keepsake);
  return game.time < (k.xpSeconds ?? 0) ? 1 + k.xpBonus : 1;
}
