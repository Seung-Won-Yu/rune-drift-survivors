import { SPECIALIZATIONS, RELICS, relicContext } from './expansion.js';
import { CHALLENGES, KEEPSAKES, challengeProgress, completedChallenges, canEquipKeepsake, keepsakeStats, discoveryCount } from './journey.js';
import { codexEntries, codexIcon } from './codex.js';
import { CHARACTERS, getCharacter, isUnlocked, unlockProgress } from './characters.js';
import { UPGRADE_META, EVOLUTIONS, weaponName } from './game.js';
import { nextExperiment, experimentProgress } from './experiments.js';
import { masteryProgress, masteryCount, VOWS, canTakeVow, vowStats } from './progression.js';
import { goalMeta, goalProgress } from './goals.js';
import { collectionArt } from './collection-art.js';
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
  const items = [
    ...(discoveries?.branches ?? []).map(key => ({ key, id: `branch:${key}`, kind: '전문화', name: SPECIALIZATIONS[key].name })),
    ...(discoveries?.evolutions ?? []).map(key => ({ key, id: `evolution:${key}`, kind: '진화', name: UPGRADE_META[key].name })),
    ...(discoveries?.relics ?? []).map(key => ({ key, id: `relic:${key}`, kind: '유물', name: RELICS[key].name }))
  ];
  if (!items.length) return '';
  return `<section class="run-discoveries" aria-label="이번 판의 새 발견"><strong>이번 판에 새로 발견했어요</strong><div class="discoveries">${items.map(item => `<article class="found discovery-trophy">${collectionArt(item.key)}<div><small>새 기록 · ${item.kind}</small><strong>${item.name}</strong></div></article>`).join('')}</div><p class="record-line">발견은 숲의 도감에 남습니다. 전투 발견 3개를 모으면 초반 성장을 돕는 기념품이 열립니다.</p><button class="secondary discovery-review" data-review-discoveries="${items[0].id}">도감에서 새 발견 보기 →</button></section>`;
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
    return `<button class="keepsake-card" data-keepsake="${id}" aria-pressed="${profile.keepsake === id}" ${unlocked ? '' : 'disabled'}><span class="keepsake-art">${collectionArt(id, !unlocked)}</span><span class="keepsake-copy"><strong>${item.name}</strong><span>${item.change}</span><small>${unlocked ? profile.keepsake === id ? '이번 출발에 선택됨' : '선택하기' : `${challenge.name} ${challengeProgress(profile, challenge)}/${challenge.target}`}</small></span></button>`;
  }).join('')}</div></section>`;
}
function masteryBoard(game, profile) {
  const c = getCharacter(game.characterId), count = masteryCount(profile, c.id);
  return `<details class="mastery-board"><summary>${c.name}의 숙련 <span>${count}/3 인장 · 성장 다시 뽑기 ${game.rerolls}회</span></summary><p class="record-line">이 동료로 달성한 기록이 남습니다. 인장 3개를 모으면 이 동료의 다시 뽑기가 매 판 1회 늘어납니다.</p><div class="mastery-seals">${masteryProgress(profile, c.id).map(seal => `<article class="${seal.current >= seal.target ? 'complete' : ''}"><strong>${seal.name}</strong><span>${seal.current}/${seal.target}</span></article>`).join('')}</div><p class="record-line">${UPGRADE_META[c.weapon].name}의 두 전문화를 서로 다른 판에서 선택 · ${UPGRADE_META[c.evolution].name} 진화 · 군주 격파</p>${profile.characters[c.id].vowWins ? `<p class="record-line">짙은 안개 군주 격파 ${profile.characters[c.id].vowWins}회</p>` : ''}</details>`;
}
function vowSelection(game, profile) {
  return `<section class="vow-selection" aria-label="숲의 서약"><div class="companion-heading"><h2>숲의 서약</h2><span>첫 군주 격파 후 도전 해금</span></div><div class="vow-options" role="group" aria-label="여정 난이도">${Object.entries(VOWS).map(([id, vow]) => `<button class="secondary" data-vow="${id}" aria-pressed="${game.vow === id}" ${canTakeVow(profile, id) ? '' : 'disabled'}><strong>${vow.name}</strong><span>${vow.change}</span>${canTakeVow(profile, id) ? '' : '<small>군주를 한 번 쓰러뜨리면 열립니다</small>'}</button>`).join('')}</div><p class="record-line">도전 격파 기록은 동료별로 남습니다. 경험치 보너스는 기념품과 합산합니다.</p></section>`;
}
function goalPlan(game, profile) {
  const meta = goalMeta(game.goal);
  if (!meta) return '';
  const entry = codexEntries(profile).find(e => e.id === game.goal);
  return `<section class="experiment-plan" aria-label="도감 수집 목표"><small>이번 판의 도감 목표</small><strong>${meta.name}</strong><p>${entry.hint}</p><p class="record-line">획득한 뒤 여정을 마치면 기록됩니다. 쓰러져도 발견은 남아요.</p><button class="secondary" data-clear-goal>수집 목표 지우기</button></section>`;
}
export function campScreen(game, profile, warning, section = 'prepare') {
  const c = getCharacter(game.characterId), record = profile.characters[c.id];
  const entries = codexEntries(profile), found = entries.filter(e => e.found).length;
  const growthUnlocked = canEquipKeepsake(profile, 'bookmark');
  const k = keepsakeStats(profile.keepsake), mastery = masteryCount(profile, c.id);
  return `<header class="camp-heading"><div><p class="eyebrow">ASH & AMBER / CHAPTER 01</p><h1 id="panel-title">잿빛의 숲</h1></div><p>작은 힘으로 시작해<br>숲의 왕관을 깨뜨리는 여정</p></header>
  <div class="camp-navigation"><div class="camp-tabs" role="group" aria-label="로비 메뉴"><button data-camp-section="prepare" aria-pressed="${section === 'prepare'}">출발 준비</button><button data-camp-section="journal" aria-pressed="${section === 'journal'}">숙련과 기록</button></div>
  <button class="codex-door" data-open-codex>${codexIcon('book')}<span><strong>숲의 도감 <b>${found} / ${entries.length}</b></strong><small>${growthUnlocked ? '첫빛의 책갈피 해금 완료 · 출발 준비에서 초반 경험치 강화' : `전투 발견 ${Math.min(3, discoveryCount(profile))}/3 → 첫빛의 책갈피 · 첫 60초 경험치 +20%`}</small></span><span aria-hidden="true">→</span></button></div>
  <div class="camp-content"><aside class="camp-stage" aria-label="선택한 동료와 이번 판의 목표"><div class="camp-scene" aria-hidden="true" style="--camp-art:url('${import.meta.env.BASE_URL}art/survivor/forest-camp-v1.webp')"><div class="camp-stage-light"></div>${portrait(c.id, true)}</div><div class="camp-stage-caption"><small>이번 여정의 동료</small><strong>${c.name}</strong><span>${c.title}</span></div><button class="camp-mastery-link" data-camp-section="journal">숙련 인장 ${mastery}/3 <span>다시 뽑기 ${game.rerolls}회 →</span></button>
  <div class="camp-stage-note"><small>다음에 만날 작은 목표</small><p>${nextGoal(profile)}</p><span>도감에서 이번 판에 모을 항목을 정할 수 있어요.</span></div></aside>
  <section class="camp-controls camp-section" aria-label="출발 준비" ${section === 'prepare' ? '' : 'hidden'}>
  <div class="companion-heading"><h2>숲에 함께할 동료</h2><span>${Object.keys(CHARACTERS).filter(id => isUnlocked(profile, id)).length} / 3</span></div>
  <div class="companion-grid">${Object.values(CHARACTERS).map(char => {
    const unlocked = isUnlocked(profile, char.id);
    return `<button class="companion-card" data-character="${char.id}" aria-pressed="${c.id === char.id}" ${unlocked ? '' : 'disabled'} style="--tone:${char.color}">${portrait(char.id)}<span class="companion-copy"><strong>${char.name}</strong><small>${UPGRADE_META[char.weapon].name} 시작</small><span>${unlocked ? c.id === char.id ? '선택한 동료' : char.title : unlockProgress(profile, char.id)}</span></span></button>`;
  }).join('')}</div>
  <div class="companion-detail"><strong>${c.name} <span>기본 · ${c.trait}</span></strong><p>${c.description}</p></div>

  ${game.goal || game.experiment ? `<div class="camp-objective">${goalPlan(game, profile)}${experimentPlan(game)}</div>` : ''}${departureKit(game, profile)}${vowSelection(game, profile)}</section>
  <section class="camp-journal camp-section" aria-label="숙련과 여정 기록" ${section === 'journal' ? '' : 'hidden'}><div class="journal-heading"><p class="eyebrow">THE FOREST REMEMBERS</p><h2>지난 여정이 다음 힘이 됩니다</h2><p>발견과 해금은 쓰러져도 남습니다.</p></div>${masteryBoard(game, profile)}${journeyScreen(profile)}
  <details class="camp-records"><summary>여정 기록 <span>${profile.runs}회 도전 · ${profile.wins}회 군주 격파</span></summary><p class="next-goal">${nextGoal(profile)}</p><p class="record-line">전문화 발견 ${profile.buildDiscoveries.length}/6 · 유물 발견 ${profile.relicDiscoveries.length}/6</p><p class="record-line">${c.name} · 최고 ${record.bestKills} 처치 · 최장 ${formatTime(record.bestTime)}${record.fastestWin === null ? '' : ` · 최단 격파 ${formatTime(record.fastestWin)}`}</p><div class="discoveries">${Object.keys(EVOLUTIONS).map(id => `<span class="${profile.discoveries.includes(id) ? 'found' : ''}">${profile.discoveries.includes(id) ? '발견' : '미발견'} · ${UPGRADE_META[id].name}</span>`).join('')}</div>${profile.history.length ? `<ol class="run-history">${profile.history.map(row => `<li><span>${getCharacter(row.character).name} · ${outcomeName[row.outcome]}${row.vow === 'mist' ? ' · 짙은 안개' : ''}</span><span>${formatTime(row.time)} · ${row.kills} 처치</span></li>`).join('')}</ol>` : '<p class="record-line">첫 여정을 시작하면 기록이 남습니다.</p>'}</details></section></div>${storageNotice(warning)}
  <footer class="camp-departure"><p class="departure-summary"><strong>이번 출발 · ${c.name}</strong><span>${UPGRADE_META[c.weapon].name} · 체력 ${game.player.maxHp} · 이동 ${c.speed + k.speed} · ${vowStats(game.vow).name}</span><span>${k.name} · ${k.change}</span>${game.goal || game.experiment ? `<span class="departure-goal">목표 · ${goalMeta(game.goal)?.name ?? SPECIALIZATIONS[game.experiment].name}</span>` : ''}</p><div><button id="start-game" class="primary">숲에 들어가기 <span aria-hidden="true">→</span></button><p class="controls-note"><span class="keyboard-copy">WASD / 방향키 이동 · Esc 일시정지</span><span class="touch-copy">왼쪽 조이스틱 이동 · 공격은 자동</span></p></div></footer>`;
}
export function buildSummary(game) {
  const branches = Object.keys(SPECIALIZATIONS).filter(key => game.ranks[key]);
  const progress = experimentProgress(game), collectionGoal = goalProgress(game);
  const k = keepsakeStats(game.keepsake);
  const growth = k.xpSeconds ? ` · ${game.time < k.xpSeconds ? `효과 ${Math.ceil(k.xpSeconds - game.time)}초 남음` : '경험치 강화 종료'}` : '';
  return `<div class="build-summary">${collectionGoal ? `<p class="experiment-progress is-${collectionGoal.state}"><strong>도감 목표</strong> ${game.phase === 'ended' && collectionGoal.state === 'complete' ? `${collectionGoal.name} 달성 · 도감 기록 완료` : collectionGoal.text}</p>` : ''}<p><strong>숲의 서약</strong> ${vowStats(game.vow).name} · ${vowStats(game.vow).change}</p><p><strong>성장 다시 뽑기</strong> ${game.rerollsUsed}회 사용 · ${game.rerolls}회 남음</p>${progress ? `<p class="experiment-progress is-${progress.state}"><strong>이번 판의 목표</strong> ${progress.text}</p>` : ''}<p><strong>출발 기념품</strong> ${k.name} · ${k.change}${growth}</p><p><strong>이번 판의 전문화</strong> ${branches.length ? branches.map(key => SPECIALIZATIONS[key].name).join(' · ') : '무기 3단계부터 선택할 수 있습니다'}</p><p><strong>숲의 유물 ${game.relics.length}/2</strong> ${game.relics.length ? game.relics.map(key => RELICS[key].name).join(' · ') : '제단 또는 저주 상자를 완료하면 얻습니다'}</p>${branches.map(key => `<small>${SPECIALIZATIONS[key].name} · ${SPECIALIZATIONS[key].change}</small>`).join('')}${game.relics.map(key => `<small>${RELICS[key].name} · ${RELICS[key].change}</small>`).join('')}</div>`;
}
export function resultDetails(game, profile, unlocked, warning, challenges = [], discoveries = null, mastery = []) {
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
  return `${runDiscoveries(discoveries)}${mastery.length ? `<section class="mastery-reward" role="status"><strong>${getCharacter(game.characterId).name} · 새 숙련 인장</strong><p>${masteryProgress(profile, game.characterId).filter(s => mastery.includes(s.id)).map(s => s.name).join(' · ')}</p><span>${masteryCount(profile, game.characterId) === 3 ? '숙련 완료! 다음 출발부터 성장 다시 뽑기 2회' : `숙련 ${masteryCount(profile, game.characterId)}/3 · 인장 3개로 다시 뽑기 +1회`}</span></section>` : ''}${game.outcome === 'victory' && game.vow === 'mist' ? `<p class="vow-victory">짙은 안개 격파 · ${getCharacter(game.characterId).name}의 도전 기록 ${profile.characters[game.characterId].vowWins}회</p>` : ''}${buildSummary(game)}${challenges.length ? `<div class="challenge-reward" role="status"><strong>숲의 도전 완료 · 새 기념품 해금</strong>${challenges.map(id => CHALLENGES.find(c => c.id === id)).map(c => `<p>${c.name} → ${KEEPSAKES[c.reward].name}<small>${KEEPSAKES[c.reward].change}</small></p>`).join('')}<span>동료 선택 → 출발 기념품에서 다음 출발에 장착하세요.</span></div>` : ''}${unlocked.length ? `<div class="unlock-reward"><strong>새로운 동료가 합류했습니다</strong><span>${unlocked.map(id => CHARACTERS[id].name).join(' · ')}</span><p>동료 선택에서 새로운 시작 무기를 만나보세요.</p></div>` : ''}
  <details class="battle-record"><summary>무기가 활약한 기록</summary><p class="record-line">받은 피해 ${Math.round(Object.values(game.damageTaken).reduce((a, b) => a + b, 0))} · 회복한 체력 ${Math.round(Object.values(game.healing).reduce((a, b) => a + b, 0))}</p>${['sword', 'ember', 'orbit'].filter(k => game.ranks[k] > 0).map(k => {
    const percent = total ? Math.round(game.damageDealt[k] / total * 100) : 0;
    return `<div class="damage-row"><span>${weaponName(game, k)}</span><b>${Math.round(game.damageDealt[k]).toLocaleString('ko-KR')} <small>(${percent}%)</small></b><i style="--share:${percent}%;--tone:${UPGRADE_META[k].color}"></i></div>`;
  }).join('')}${game.damageDealt.relic ? `<p class="record-line">가시 심장 피해 ${Math.round(game.damageDealt.relic)}</p>` : ''}</details><p class="next-goal">${hint}</p>${game.outcome === 'defeat' ? `<p class="record-line">다음 여정 · ${nextGoal(profile)}</p>` : ''}${nextExperimentCard(game, profile)}${storageNotice(warning)}`;
}
