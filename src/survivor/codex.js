import { CHARACTERS, isUnlocked, unlockProgress } from './characters.js';
import { SPECIALIZATIONS, RELICS } from './expansion.js';
import { EVOLUTIONS, UPGRADE_META } from './game.js';
import { validGoal } from './progression.js';
import { collectionArt } from './collection-art.js';
import { CHALLENGES, KEEPSAKES, canEquipKeepsake, challengeProgress } from './journey.js';

export const CODEX_GROUPS = { all: '전체', companions: '동료', weapons: '무기', relics: '유물', keepsakes: '기념품' };

// The codex reads the existing save. Opening a page never grants a discovery.
export function codexEntries(profile) {
  return [
    ...Object.values(CHARACTERS).map(c => ({
      id: `companion:${c.id}`, group: 'companions', kind: '동료', name: c.name,
      found: isUnlocked(profile, c.id), color: c.color, art: c.art,
      description: c.description, change: `${UPGRADE_META[c.weapon].name} 시작 · ${c.trait}`,
      hint: c.id === 'ash' ? '처음부터 함께하는 동료입니다.' : `${unlockProgress(profile, c.id)} · 여정을 마치면 합류합니다.`,
      use: '출발 전에 동료를 고르면 시작 무기와 기본 능력이 바뀝니다.'
    })),
    ...Object.entries(SPECIALIZATIONS).map(([key, s]) => ({
      ...s, id: `branch:${key}`, group: 'weapons', kind: '전문화', found: profile.buildDiscoveries.includes(key),
      hint: `${UPGRADE_META[s.weapon].name} 3단계 · 레벨 4부터 ${s.name}을 선택하고 여정을 마치세요.`,
      use: '한 무기당 한 갈래를 선택합니다. 다음 판에서는 다시 성장시킵니다.'
    })),
    ...Object.entries(EVOLUTIONS).map(([key, recipe]) => ({
      ...UPGRADE_META[key], id: `evolution:${key}`, group: 'weapons', kind: '진화', found: profile.discoveries.includes(key),
      change: `진화 조건 · ${recipe.requirement}`,
      hint: `${recipe.requirement}을 갖춘 뒤 레벨업에서 진화를 선택하고 여정을 마치세요.`,
      use: '발견한 진화의 조합은 도감에 남습니다. 다음 판에서도 조건을 갖추어 진화합니다.'
    })),
    ...Object.entries(RELICS).map(([key, r]) => ({
      ...r, id: `relic:${key}`, group: 'relics', kind: '유물', found: profile.relicDiscoveries.includes(key),
      hint: `봉인 제단 또는 저주 상자의 보상에서 ${r.name}을 선택하고 여정을 마치세요.`,
      use: key === 'dew' ? '한 판에서 유물 두 개까지 지닙니다. 첫빛의 책갈피의 경험치 보너스는 이슬 씨앗의 회복 충전량을 늘리지 않습니다.' : '한 판에서 유물 두 개까지 지닙니다. 보상 후보는 위험을 받아들이기 전에 살펴볼 수 있습니다.'
    })),
    ...CHALLENGES.map(c => ({
      ...KEEPSAKES[c.reward], id: `keepsake:${c.reward}`, group: 'keepsakes', kind: '출발 기념품',
      icon: { seed: 'seed', ribbon: 'fleet', crown: 'crown', bookmark: 'book' }[c.reward], color: '#e8bf79',
      found: canEquipKeepsake(profile, c.reward), description: '지난 여정에서 얻은 작은 힘으로 다음 출발을 준비합니다.',
      hint: `${c.name} · ${challengeProgress(profile, c)}/${c.target} · ${c.description}`,
      use: '해금은 계속 유지됩니다. 출발 준비에서 하나만 선택하며 빈손으로도 도전할 수 있습니다.'
    }))
  ];
}

const paths = {
  sword: 'M5 19 17 7M13 4l7-1-1 7-5 5-5-5zM4 14l6 6M3 21l3-3',
  ember: 'M13 2c1 5-3 6-2 10 2-1 3-3 4-4 4 5 6 13-3 14-10-1-10-8-5-13-1 4 1 5 2 5-1-5 3-6 4-12z',
  orbit: 'M12 7l3 5-3 5-3-5zM6 5c-5 4-4 12 2 15M18 19c5-4 4-12-2-15M4 5h3V2M20 19h-3v3',
  fleet: 'M14 3 5 14h7l-2 7 10-12h-8z',
  heart: 'M12 21S2 14 2 7a5 5 0 0 1 10-2 5 5 0 0 1 10 2c0 7-10 14-10 14z',
  seed: 'M12 21V11M12 15C4 15 3 10 3 5c7 0 9 4 9 10zM12 11c0-6 4-8 9-8 0 6-3 9-9 8z',
  crown: 'M3 6l5 4 4-7 4 7 5-4-2 13H5zM5 16h14',
  book: 'M12 5v16M12 5C9 2 4 3 2 4v15c4-2 7-1 10 2 3-3 6-4 10-2V4c-2-1-7-2-10 1zM5 8l4 1M15 9l4-1'
};
export const codexIcon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] ?? paths.book}"/></svg>`;
function art(entry) {
  if (!entry.art) return collectionArt(entry.id, !entry.found) || codexIcon(entry.icon);
  return `<span class="codex-portrait${entry.found ? '' : ' is-silhouette'}" aria-hidden="true" style="background-image:url('${import.meta.env.BASE_URL}art/survivor/${entry.art}');--atlas-height:${entry.id === 'companion:grove' ? 261.25 : 285}%;--portrait-ratio:${313.5 / (entry.id === 'companion:grove' ? 480 : 440)}"></span>`;
}
export function codexScreen(profile, filter = 'all', selected = null) {
  const entries = codexEntries(profile), found = entries.filter(e => e.found).length;
  const visible = entries.filter(e => filter === 'all' || e.group === filter);
  const current = visible.find(e => e.id === selected) ?? visible[0];
  return `<div class="codex-heading"><div><p class="eyebrow">숲에서 발견한 것들</p><h1 id="panel-title">숲의 도감</h1></div><button class="secondary codex-back" data-close-codex>← 출발 준비</button></div>
    <div class="codex-progress"><div><strong>${found}<span> / ${entries.length}</span></strong><span>발견과 해금</span></div><progress value="${found}" max="${entries.length}" aria-label="도감 수집 진행도"></progress><p>쓰러져도 발견은 남습니다. 한 장씩 채우며 다음 여정을 준비하세요.</p></div>
    <div class="codex-filters" role="group" aria-label="도감 분류">${Object.entries(CODEX_GROUPS).map(([key, label]) => {
      const group = entries.filter(e => key === 'all' || e.group === key);
      return `<button data-codex-filter="${key}" aria-pressed="${filter === key}">${label}<span>${group.filter(e => e.found).length}/${group.length}</span></button>`;
    }).join('')}</div>
    <div class="codex-layout"><div class="codex-list"><p class="codex-list-label" role="status">${CODEX_GROUPS[filter]} · ${visible.filter(e => e.found).length}/${visible.length} 기록 · 항목을 눌러 살펴보세요</p><div class="codex-grid" role="group" aria-label="도감 항목">${visible.map(e => `<button class="codex-card ${e.found ? 'is-found' : 'is-missing'}" data-codex-entry="${e.id}" aria-pressed="${e.id === current.id}" style="--tone:${e.color}"><span class="codex-art">${art(e)}</span><small>${e.kind}</small><strong>${e.name}</strong><span class="codex-state">${e.found ? e.group === 'companions' || e.group === 'keepsakes' ? '해금 완료' : '발견 완료' : e.group === 'companions' || e.group === 'keepsakes' ? '미해금' : '미발견'}</span></button>`).join('')}</div></div>
    <section class="codex-detail" tabindex="0" aria-live="polite" aria-label="선택한 도감 항목" style="--tone:${current.color}"><div class="codex-detail-art">${art(current)}</div><small>${current.kind} · ${current.found ? '기록 완료' : '다음 발견을 기다리는 중'}</small><h2 tabindex="-1">${current.name}</h2><p>${current.description}</p><p class="codex-effect">${current.change}</p>${!current.found && validGoal(current.id) ? `<button class="secondary codex-goal" data-codex-goal="${current.id}" aria-pressed="${profile.goal === current.id}">${profile.goal === current.id ? '목표 지정됨 · 해제하기' : '이번 판의 목표로 지정'}</button><p class="record-line">목표는 하나만 추적합니다. 실제로 획득해야 기록됩니다.</p>` : ''}<div class="codex-hint"><strong>${current.found ? '발견 방법' : '이렇게 기록하세요'}</strong><p>${current.hint}</p></div><p class="record-line">${current.use}</p><button class="secondary codex-return" data-codex-list>선택 항목으로 돌아가기 ↓</button></section></div>`;
}
