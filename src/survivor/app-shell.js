import { forestCrest } from './ui-art.js';
import { canEquipKeepsake, discoveryCount } from './journey.js';

const paths = {
  prepare: 'm12 3 7 18-7-4-7 4zM12 3v14',
  codex: 'M12 5v16M12 5C9 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-2-1-7-2-10 1z',
  journal: 'm12 3 3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1z',
  settings: 'M5 4v16M12 4v16M19 4v16M2 8h6M9 16h6M16 10h6',
  fullscreen: 'M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`;

export function appHeader(title) {
  return `<header class="app-header camp-heading">
    <div class="camp-brand">${forestCrest()}<div><p class="eyebrow">ASH & AMBER</p><h1 id="panel-title">${title}</h1></div></div>
    <div class="app-tools"><span class="app-chapter">CHAPTER 01 <i></i> 잿빛의 숲</span>
      <button class="app-tool" data-app-fullscreen aria-label="전체 화면" aria-pressed="false" title="전체 화면">${icon('fullscreen')}</button>
      <button class="app-tool" data-app-settings aria-label="게임 설정" title="게임 설정">${icon('settings')}</button>
    </div><span class="app-status" data-app-status role="status"></span>
  </header>`;
}

export function appNavigation(active, found, total, profile) {
  const collecting = !canEquipKeepsake(profile, 'bookmark');
  return `<nav class="camp-navigation camp-tabs app-navigation" aria-label="로비 메뉴">
    <button data-camp-section="prepare" aria-pressed="${active === 'prepare'}">${icon('prepare')}<span>출발 준비</span></button>
    <button class="codex-door" data-open-codex aria-pressed="${active === 'codex'}"${collecting ? ' title="전투 발견 3개를 모으면 첫빛의 책갈피 · 첫 60초 경험치 +20%"' : ''}>${icon('codex')}<span>숲의 도감</span><b>${found} / ${total}</b>${collecting ? `<small>전투 발견 ${Math.min(3,discoveryCount(profile))}/3</small>` : ''}</button>
    <button data-camp-section="journal" aria-pressed="${active === 'journal'}">${icon('journal')}<span>숙련과 기록</span></button>
    <span class="app-nav-foot" aria-hidden="true">A & A</span>
  </nav>`;
}
