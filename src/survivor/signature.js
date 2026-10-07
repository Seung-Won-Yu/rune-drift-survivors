// Each companion earns a different automatic payoff through play, never menu time.
export const SIGNATURES = {
  ash: { name: '잿빛 결의', action: '검을 맞혀 결의를 쌓으세요', description: '검 적중 6회마다 다음 검격의 피해 ×1.6 · 범위 +25. 한 검격은 최대 3회 충전합니다.', ready: '다음 검격 강화', color: '#f2ca80' },
  ember: { name: '잔불 걸음', action: '이동해서 강화 불씨를 준비하세요', description: '이동으로 힘을 모아 다음 첫 불씨의 피해 ×1.45 · 폭발 확대. 번지는 불꽃은 주변에도 연소를 붙입니다.', ready: '다음 불씨 강화', color: '#ffac80' },
  grove: { name: '숲의 수호', action: '회전 룬을 맞혀 수호를 쌓으세요', description: '회전 룬 적중 6회마다 4초간 보호막 20. 한 번에 하나씩 충전하며 발동 뒤 5초간 다시 준비합니다.', ready: '수호 준비', color: '#a1e4ce' }
};
export const createSignature = () => ({ charge: 0, guard: 0, guardUntil: 0, cooldownUntil: 0, hitAt: -1, activatedAt: -10, blockedAt: -10, activations: 0, absorbed: 0 });
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
  if (consumeSignature(game, 'grove')) {
    s.guard = 20; s.guardUntil = game.time + 4; s.cooldownUntil = game.time + 5;
  }
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
  const meta = SIGNATURES[game.characterId], s = game.signature;
  if (s.guard > 0 && game.time < s.guardUntil) return { ...meta, value: s.guard / 20, state: 'guard', label: `보호막 ${Math.ceil(s.guard)} · ${Math.ceil(s.guardUntil - game.time)}초` };
  if (game.characterId === 'grove' && game.time < s.cooldownUntil) return { ...meta, value: 0, state: 'rest', label: `${Math.ceil(s.cooldownUntil - game.time)}초 뒤 수호 준비` };
  const ready = s.charge >= 1 - 1e-9;
  return { ...meta, value: s.charge, state: ready ? 'ready' : 'charging', label: ready ? meta.ready : game.characterId === 'ember' ? `이동 충전 ${Math.floor(s.charge * 100)}%` : `적중 ${Math.min(6, Math.floor(s.charge * 6 + 1e-8))}/6` };
}
