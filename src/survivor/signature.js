// Earn through play, hold the charge, then choose when to release it.
export const SIGNATURES = {
  ash: { name: '잿빛 결의', control: '결의 검격', action: '검 적중 6회 충전 · E로 원하는 방향에 검기를 쏘세요', description: '검 적중 6회로 충전합니다. E 또는 고유기 버튼을 누르면 이동 방향으로 피해 ×1.6 · 범위 +25의 검격과 세 갈래 관통 검기를 날립니다. 진화 후 다섯 갈래 왕복 검기. 한 공격은 최대 3회 충전합니다.', ready: 'E · 검기 발동', color: '#f2ca80' },
  ember: { name: '잔불 걸음', control: '분열 불씨', action: '이동으로 충전 · E로 무리가 모였을 때 불씨를 쏘세요', description: '이동으로 충전합니다. E 또는 고유기 버튼으로 이동 방향에 피해 ×1.45의 분열 불씨를 발사합니다. 직접 겨냥하며, 적중 후 세 갈래 불꽃 파편을 만듭니다.', ready: 'E · 분열 불씨', color: '#ffac80' },
  grove: { name: '숲의 수호', control: '수호 방출', action: '룬 적중 6회 충전 · E로 보호막과 왕복 룬을 펼치세요', description: '회전 룬 적중 6회로 충전합니다. E 또는 고유기 버튼으로 보호막 20을 4초간 얻고 여덟 방향 왕복 룬을 방출합니다. 돌아오는 룬은 현재 위치를 따라와 다시 적중합니다. 편도마다 최대 3명 관통. 발동 뒤 5초간 충전을 쉽니다.', ready: 'E · 수호 방출', color: '#a1e4ce' }
};
export const createSignature = () => ({ charge: 0, pending: null, guard: 0, guardUntil: 0, cooldownUntil: 0, hitAt: -1, activatedAt: -10, blockedAt: -10, activations: 0, absorbed: 0 });
export const canReleaseSignature = game => game.phase === 'playing' && game.player.hp > 0 && game.signature.charge >= 1-1e-9 && !game.signature.pending;
export function signatureDescription(game) {
  if (game.characterId !== 'ember') return SIGNATURES[game.characterId].description;
  return `이동으로 충전 · E 또는 고유기 버튼으로 이동 방향에 직접 발사 · 첫 불씨의 직격 피해 ×1.45 · 적중 후 세 갈래 불꽃 파편 · ${game.ranks.wildfire
    ? '적중 지점 주변에도 3초 연소를 붙입니다.' : `폭발 반경 +18${game.ranks.comet ? ' · 파편도 폭발합니다' : ''}.`}`;
}
export function advanceSignature(game, distance) {
  const s = game.signature;
  if (game.time >= s.guardUntil) s.guard = 0;
  if (game.characterId === 'ember') s.charge = Math.min(1, s.charge + Math.max(0, distance) / 480);
}
export function chargeBlade(game, hits) {
  if (game.characterId === 'ash' && hits > 0) game.signature.charge = Math.min(1, game.signature.charge + Math.min(3, hits) / 6);
}
export function consumeSignature(game, id) {
  const s = game.signature;
  if (game.characterId !== id || s.charge < 1 - 1e-9) return false;
  s.charge = 0; s.activatedAt = game.time; s.activations++;
  game.events.push(`signature-${id}`);
  return true;
}
export function chargeRune(game) {
  const s = game.signature;
  if (game.characterId !== 'grove' || game.time < s.cooldownUntil || game.time - s.hitAt < .35) return;
  s.hitAt = game.time;
  s.charge = Math.min(1, s.charge + 1 / 6);
}
export function absorbDamage(game, damage) {
  const s = game.signature;
  if (s.guard <= 0 || game.time >= s.guardUntil) return damage;
  const absorbed = Math.min(s.guard, damage);
  s.guard -= absorbed; s.absorbed += absorbed; s.blockedAt = game.time;
  game.events.push('guard-block');
  return damage - absorbed;
}
export function signatureState(game) {
  const meta = { ...SIGNATURES[game.characterId], description: signatureDescription(game) }, s = game.signature;
  if (game.characterId === 'ash' && game.ranks.dawn) meta.ready = 'E · 왕복 검기';
  if (s.guard > 0 && game.time < s.guardUntil) return { ...meta, value: s.guard / 20, state: 'guard', label: `보호막 ${Math.ceil(s.guard)} · ${Math.ceil(s.guardUntil - game.time)}초` };
  if (game.characterId === 'grove' && game.time < s.cooldownUntil) return { ...meta, value: 0, state: 'rest', label: `${Math.ceil(s.cooldownUntil - game.time)}초 뒤 수호 준비` };
  const ready = s.charge >= 1 - 1e-9;
  return { ...meta, value: s.charge, state: ready ? 'ready' : 'charging', label: ready ? meta.ready : game.characterId === 'ember' ? `이동 충전 ${Math.floor(s.charge * 100)}%` : `적중 ${Math.min(6, Math.floor(s.charge * 6 + 1e-8))}/6` };
}
