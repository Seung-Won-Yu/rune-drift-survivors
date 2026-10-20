export const PREFERENCES_KEY = 'ash-preferences-v1';
export function normalizePreferences(value) {
  return {motion: value?.motion === 'reduced' ? 'reduced' : 'system', damageNumbers: value?.damageNumbers !== false};
}
export function loadPreferences(storage) {
  try { return normalizePreferences(JSON.parse(storage?.getItem(PREFERENCES_KEY) ?? 'null')); }
  catch { return normalizePreferences(null); }
}
export function savePreferences(storage, preferences) {
  try { storage.setItem(PREFERENCES_KEY, JSON.stringify(normalizePreferences(preferences))); return true; }
  catch { return false; }
}
export const reduceMotion = (preferences, systemReduced) => preferences.motion === 'reduced' || systemReduced;
export function preferenceControls(preferences, sound) {
  return `<details class="play-preferences"><summary><strong>화면·소리 설정</strong><span>이 브라우저에 기억합니다</span></summary><div class="preference-options"><label><span>효과음<small>공격·피격·성장 소리</small></span><input type="checkbox" data-preference="sound" ${sound ? 'checked' : ''}></label><label><span>피해 숫자<small>적에게 준 피해량 표시</small></span><input type="checkbox" data-preference="damageNumbers" ${preferences.damageNumbers ? 'checked' : ''}></label><label class="motion-preference"><span>움직임 표현<small>공격 예고와 실제 판정은 유지</small></span><select data-preference="motion" aria-label="움직임 표현"><option value="system" ${preferences.motion==='system'?'selected':''}>기기 설정 따르기</option><option value="reduced" ${preferences.motion==='reduced'?'selected':''}>모션 줄이기</option></select></label></div><p class="preference-note" data-preference-status role="status"><span class="keyboard-copy">WASD / 방향키 이동 · Esc / P 계속하기 · 1–3 성장 선택</span><span class="touch-copy">왼쪽 조이스틱 이동 · 무기 아이콘으로 장비 확인</span></p></details>`;
}
