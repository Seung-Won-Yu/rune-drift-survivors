import { SPECIALIZATIONS, RELICS, relicContext } from './expansion.js';
import { CHALLENGES, KEEPSAKES, challengeProgress, completedChallenges, canEquipKeepsake, keepsakeStats, discoveryCount } from './journey.js';
import { codexEntries, codexIcon } from './codex.js';
import { CHARACTERS, getCharacter, isUnlocked, unlockProgress } from './characters.js';
import { UPGRADE_META, EVOLUTIONS, weaponName } from './game.js';
import { nextExperiment, experimentProgress } from './experiments.js';
export const formatTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const outcomeName = {
  victory: '군주 격파',
  survived: '생존',
  defeat: '쓰러짐'
};
export function portrait(id, large = false) {
  const c = getCharacter(id);
  return `<div class="${large ? 'hero-art' : 'companion-art'}" role="img" aria-label="${c.name}" style="--atlas-height:${id === 'grove' ? 261.25 : 285}%;--portrait-ratio:${313.5 / (id === 'grove' ? 480 : 440)};background-image:url('${import.meta.env.BASE_URL}art/survivor/${c.art}')"></div>`;
}
export function nextGoal(profile) {
  const locked = Object.keys(CHARACTERS).find(id => !isUnlocked(profile, id));
  if (locked) return `${CHARACTERS[locked].name}와 만나기 · ${unlockProgress(profile, locked)}`;
  const challenge = CHALLENGES.find(c => challengeProgress(profile, c) < c.target);
  if (challenge) return `${challenge.name} · ${challengeProgress(profile, challenge)}/${challenge.target} · ${challenge.description} 보상: ${KEEPSAKES[challenge.reward].name}`;
  const discovery = Object.keys(EVOLUTIONS).find(id => !profile.discoveries.includes(id));
  if (discovery) return `${UPGRADE_META[discovery].name} 발견하기 · ${EVOLUTIONS[discovery].requirement}`;
  const branch = Object.keys(SPECIALIZATIONS).find(id => !profile.buildDiscoveries.includes(id));
  if (branch) return `${SPECIALIZATIONS[branch].name} 시도하기 · 해당 무기를 3단계까지 키우세요`;
  if (profile.relicDiscoveries.length < 6) return `숲의 유물 발견 ${profile.relicDiscoveries.length}/6 · 제단과 저주 상자에 도전하세요`;
  return profile.wins ? '다른 동료로 재의 군주에게 도전해 보세요.' : '다음 목표 · 4분에 나타나는 재의 군주 격파';
}
export function storageNotice(warning) {
  return warning ? `<p class="storage-note" role="status">${warning}</p>` : '';
}
export function relicContextMarkup(game, key) {
  const context = relicContext(game, key);
  return `<span class="relic-context is-${context.kind}"><b>${context.label}</b><span>${context.detail}</span></span>`;
}
export function encounterRewardPreview(game, event) {
  return `<div class="reward-preview-list">${(event?.rewards ?? []).map(key => `<article data-preview-relic="${key}" style="--tone:${RELICS[key].color}"><strong>${RELICS[key].name}</strong><p>${RELICS[key].change}</p>${relicContextMarkup(game, key)}</article>`).join('')}</div><p class="record-line">완료하면 이 후보 중 하나를 선택합니다. 살펴보기로 보상이 바뀌지는 않습니다.</p>`;
}
export function experimentPlan(game) {
  const progress = experimentProgress(game);
  if (!progress) return '';
  const target = SPECIALIZATIONS[progress.key];
  return `<section class="experiment-plan" aria-label="이번 판의 목표"><small>이번 판의 목표</small><strong>${target.name}</strong><p>${target.description}</p><p class="record-line">${UPGRADE_META[target.weapon].name} 3단계 · 레벨 4부터 선택 후보로 등장합니다. 다른 갈래를 골라도 괜찮습니다.</p><button class="secondary" data-clear-experiment>목표 지우기</button></section>`;
}
export function runDiscoveries(discoveries) {
  const names = [
    ...(discoveries?.branches ?? []).map(key => `전문화 · ${SPECIALIZATIONS[key].name}`),
    ...(discoveries?.evolutions ?? []).map(key => `진화 · ${UPGRADE_META[key].name}`),
    ...(discoveries?.relics ?? []).map(key => `유물 · ${RELICS[key].name}`)
  ];
  if (!names.length) return '';
  return `<section class="run-discoveries" aria-label="이번 판의 새 발견"><strong>이번 판에 새로 발견했어요</strong><div class="discoveries">${names.map(name => `<span class="found">${name}</span>`).join('')}</div><p class="record-line">발견은 숲의 도감에 남습니다. 전투 발견 3개를 모으면 초반 성장을 돕는 기념품이 열립니다.</p></section>`;
}
export function nextExperimentCard(game, profile) {
  const key = nextExperiment(game, profile);
  if (!key || !isUnlocked(profile, game.characterId)) return '';
  const target = SPECIALIZATIONS[key];
  return `<section class="next-experiment" aria-label="다음 판의 실험"><small>다음 판의 실험 · ${profile.buildDiscoveries.includes(key) ? '다른 갈래로 도전' : '아직 발견하지 않은 갈래'}</small><strong>${target.name}</strong><p>${target.description}</p><p class="experiment-change">${target.change}</p><button class="secondary" data-experiment="${key}">이 빌드로 다음 판 준비</button><p class="record-line">${getCharacter(game.characterId).name} · ${UPGRADE_META[target.weapon].name} 3단계부터 선택합니다.</p></section>`;
}
export function journeyScreen(profile) {
  const completed = completedChallenges(profile);
  const next = CHALLENGES.find(c => !completed.includes(c));
  return `<details class="journey-board"><summary>숲의 도전 <span>${completed.length}/${CHALLENGES.length} 완료 · 기념품 해금</span></summary><p class="record-line">여정을 마치면 도전이 기록됩니다. 해금한 기념품은 출발 준비에서 선택하세요.</p><div class="challenge-list">${CHALLENGES.map(c => {
    const progress = challengeProgress(profile, c), done = progress === c.target;
    return `<article class="challenge-row ${done ? 'complete' : ''}" data-challenge="${c.id}"><strong>${c.name} <span>${done ? '완료' : `${progress}/${c.target}`}</span></strong><p>${c.description}</p><small>보상 · ${KEEPSAKES[c.reward].name}</small><progress value="${progress}" max="${c.target}" aria-label="${c.name} 진행도"></progress></article>`;
  }).join('')}</div></details><p class="journey-preview">${next ? `다음 도전 · ${next.name} ${challengeProgress(profile, next)}/${next.target}` : `숲의 도전 ${CHALLENGES.length}개 완료`} · 기념품: ${keepsakeStats(profile.keepsake).name}</p>`;
}
function departureKit(game, profile) {
  const c = getCharacter(game.characterId), k = keepsakeStats(profile.keepsake);
  return `<section class="departure-kit" aria-labelledby="keepsake-title"><div class="companion-heading"><h2 id="keepsake-title">출발 기념품</h2><span>한 개만 선택 · 해금은 계속 유지</span></div><div class="keepsake-grid" role="group" aria-label="출발 기념품">${Object.entries(KEEPSAKES).map(([id, item]) => {
    const unlocked = canEquipKeepsake(profile, id), challenge = CHALLENGES.find(c => c.reward === id);
    return `<button class="keepsake-card" data-keepsake="${id}" aria-pressed="${profile.keepsake === id}" ${unlocked ? '' : 'disabled'}><strong>${item.name}</strong><span>${item.change}</span><small>${unlocked ? profile.keepsake === id ? '이번 출발에 선택됨' : '선택하기' : `${challenge.name} ${challengeProgress(profile, challenge)}/${challenge.target}`}</small></button>`;
  }).join('')}</div><p class="departure-summary"><strong>이번 출발</strong> ${UPGRADE_META[c.weapon].name} · 체력 ${game.player.maxHp} · 이동 ${c.speed + k.speed}<span>${k.name} · ${k.change}</span></p></section>`;
}
export function campScreen(game, profile, warning) {
  const c = getCharacter(game.characterId),
    record = profile.characters[c.id];
  const entries = codexEntries(profile), found = entries.filter(e => e.found).length;
  const growthUnlocked = canEquipKeepsake(profile, 'bookmark');
  return `<div class="start-layout"><div><p class="eyebrow">ASH & AMBER / CHAPTER 01</p><h1 id="panel-title">잿빛의 숲</h1><p class="panel-lead">동료를 고르고, 작은 힘을 키워<br>숲의 군주를 쓰러뜨리세요.</p><div class="start-meta"><span>5분의 도전</span><span>자동 공격</span><span>선택으로 성장</span></div></div>${portrait(c.id, true)}</div>
  <button class="codex-door" data-open-codex>${codexIcon('book')}<span><strong>숲의 도감 <b>${found} / ${entries.length}</b></strong><small>${growthUnlocked ? '첫빛의 책갈피 해금 완료 · 출발 준비에서 초반 경험치 강화' : `전투 발견 ${Math.min(3, discoveryCount(profile))}/3 → 첫빛의 책갈피 · 첫 60초 경험치 +20%`}</small></span><span aria-hidden="true">→</span></button>
  <div class="companion-heading"><h2>숲에 함께할 동료</h2><span>${Object.keys(CHARACTERS).filter(id => isUnlocked(profile, id)).length} / 3</span></div>
  <div class="companion-grid">${Object.values(CHARACTERS).map(char => {
    const unlocked = isUnlocked(profile, char.id);
    return `<button class="companion-card" data-character="${char.id}" aria-pressed="${c.id === char.id}" ${unlocked ? '' : 'disabled'} style="--tone:${char.color}">${portrait(char.id)}<span class="companion-copy"><strong>${char.name}</strong><small>${UPGRADE_META[char.weapon].name} 시작</small><span>${unlocked ? c.id === char.id ? '선택한 동료' : char.title : unlockProgress(profile, char.id)}</span></span></button>`;
  }).join('')}</div>
  <div class="companion-detail"><strong>${c.name} <span>기본 · ${c.trait}</span></strong><p>${c.description}</p></div>
  ${departureKit(game, profile)}
  ${experimentPlan(game)}
  <div class="panel-actions"><button id="start-game" class="primary">숲에 들어가기 <span aria-hidden="true">→</span></button></div>
  <p class="controls-note"><span class="keyboard-copy"><kbd>WASD</kbd> / <kbd>방향키</kbd> 이동 · <kbd>Esc</kbd> 일시정지</span><span class="touch-copy">왼쪽 조이스틱으로 이동 · 공격은 자동으로 실행됩니다</span></p>
  ${journeyScreen(profile)}
  <details class="camp-records"><summary>여정 기록 <span>${profile.runs}회 도전 · ${profile.wins}회 군주 격파</span></summary><p class="next-goal">${nextGoal(profile)}</p><p class="record-line">전문화 발견 ${profile.buildDiscoveries.length}/6 · 유물 발견 ${profile.relicDiscoveries.length}/6</p><p class="record-line">${c.name} · 최고 ${record.bestKills} 처치 · 최장 ${formatTime(record.bestTime)}${record.fastestWin === null ? '' : ` · 최단 격파 ${formatTime(record.fastestWin)}`}</p><div class="discoveries">${Object.keys(EVOLUTIONS).map(id => `<span class="${profile.discoveries.includes(id) ? 'found' : ''}">${profile.discoveries.includes(id) ? '발견' : '미발견'} · ${UPGRADE_META[id].name}</span>`).join('')}</div>${profile.history.length ? `<ol class="run-history">${profile.history.map(row => `<li><span>${getCharacter(row.character).name} · ${outcomeName[row.outcome]}</span><span>${formatTime(row.time)} · ${row.kills} 처치</span></li>`).join('')}</ol>` : '<p class="record-line">첫 여정을 시작하면 기록이 남습니다.</p>'}</details>${storageNotice(warning)}`;
}
export function buildSummary(game) {
  const branches = Object.keys(SPECIALIZATIONS).filter(key => game.ranks[key]);
  const progress = experimentProgress(game);
  const k = keepsakeStats(game.keepsake);
  const growth = k.xpSeconds ? ` · ${game.time < k.xpSeconds ? `효과 ${Math.ceil(k.xpSeconds - game.time)}초 남음` : '경험치 강화 종료'}` : '';
  return `<div class="build-summary">${progress ? `<p class="experiment-progress is-${progress.state}"><strong>이번 판의 목표</strong> ${progress.text}</p>` : ''}<p><strong>출발 기념품</strong> ${k.name} · ${k.change}${growth}</p><p><strong>이번 판의 전문화</strong> ${branches.length ? branches.map(key => SPECIALIZATIONS[key].name).join(' · ') : '무기 3단계부터 선택할 수 있습니다'}</p><p><strong>숲의 유물 ${game.relics.length}/2</strong> ${game.relics.length ? game.relics.map(key => RELICS[key].name).join(' · ') : '제단 또는 저주 상자를 완료하면 얻습니다'}</p>${branches.map(key => `<small>${SPECIALIZATIONS[key].name} · ${SPECIALIZATIONS[key].change}</small>`).join('')}${game.relics.map(key => `<small>${RELICS[key].name} · ${RELICS[key].change}</small>`).join('')}</div>`;
}
export function resultDetails(game, profile, unlocked, warning, challenges = [], discoveries = null) {
  const total = Object.values(game.damageDealt).reduce((sum, n) => sum + n, 0);
  const tips = {
    hunt: '사냥개가 몸을 낮추면 표시된 직선 옆으로 피하세요.',
    spore: '버섯이 남긴 포자 원은 잠시 기다렸다 지나가세요.',
    contact: '적의 무리 한가운데보다 가장자리를 따라 이동해 보세요.',
    slam: '내려찍기의 원형 예고가 나타나면 원 밖으로 빠져나오세요.',
    charge: '군주의 돌진선 옆으로 이동하면 공격 뒤 빈틈을 노릴 수 있습니다.',
    thorns: '가시 사이의 빈 공간으로 조금씩 이동해 보세요.'
  };
  const dominant = Object.entries(game.damageTaken).sort((a, b) => b[1] - a[1])[0];
  const hint = game.outcome === 'defeat' && dominant?.[1] > 0 ? tips[dominant[0]] : nextGoal(profile);
  return `${runDiscoveries(discoveries)}${buildSummary(game)}${challenges.length ? `<div class="challenge-reward" role="status"><strong>숲의 도전 완료 · 새 기념품 해금</strong>${challenges.map(id => CHALLENGES.find(c => c.id === id)).map(c => `<p>${c.name} → ${KEEPSAKES[c.reward].name}<small>${KEEPSAKES[c.reward].change}</small></p>`).join('')}<span>동료 선택 → 출발 기념품에서 다음 출발에 장착하세요.</span></div>` : ''}${unlocked.length ? `<div class="unlock-reward"><strong>새로운 동료가 합류했습니다</strong><span>${unlocked.map(id => CHARACTERS[id].name).join(' · ')}</span><p>동료 선택에서 새로운 시작 무기를 만나보세요.</p></div>` : ''}
  <details class="battle-record"><summary>무기가 활약한 기록</summary><p class="record-line">받은 피해 ${Math.round(Object.values(game.damageTaken).reduce((a, b) => a + b, 0))} · 회복한 체력 ${Math.round(Object.values(game.healing).reduce((a, b) => a + b, 0))}</p>${['sword', 'ember', 'orbit'].filter(k => game.ranks[k] > 0).map(k => {
    const percent = total ? Math.round(game.damageDealt[k] / total * 100) : 0;
    return `<div class="damage-row"><span>${weaponName(game, k)}</span><b>${Math.round(game.damageDealt[k]).toLocaleString('ko-KR')} <small>(${percent}%)</small></b><i style="--share:${percent}%;--tone:${UPGRADE_META[k].color}"></i></div>`;
  }).join('')}${game.damageDealt.relic ? `<p class="record-line">가시 심장 피해 ${Math.round(game.damageDealt.relic)}</p>` : ''}</details><p class="next-goal">${hint}</p>${game.outcome === 'defeat' ? `<p class="record-line">다음 여정 · ${nextGoal(profile)}</p>` : ''}${nextExperimentCard(game, profile)}${storageNotice(warning)}`;
}
