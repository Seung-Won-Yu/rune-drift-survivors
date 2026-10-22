import { SIGNATURES } from './signature.js';
import { SPECIALIZATIONS, RELICS, relicContext } from './expansion.js';
import { CHALLENGES, KEEPSAKES, challengeProgress, completedChallenges, canEquipKeepsake, keepsakeStats } from './journey.js';
import { codexEntries, codexIcon } from './codex.js';
import { CHARACTERS, getCharacter, isUnlocked, unlockProgress } from './characters.js';
import { UPGRADE_META, EVOLUTIONS, weaponName } from './game.js';
import { nextExperiment, experimentProgress } from './experiments.js';
import { primaryBranches, validInheritance, masteryProgress, masteryCount, VOWS, canTakeVow, vowStats } from './progression.js';
import { goalMeta, goalProgress } from './goals.js';
import { collectionArt } from './collection-art.js';
import { appHeader, appNavigation } from './app-shell.js';
export const formatTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const outcomeName = {
  victory: '군주 격파',
  survived: '생존',
  defeat: '쓰러짐'
};
const companionRhythm = {
  ash: '검을 맞혀 충전하고, 다음 검격으로 돌파하세요.',
  ember: '움직여 충전하고, 강화 불씨를 날리세요.',
  grove: '룬을 맞혀 충전하고, 보호막으로 버티세요.'
};
export function portrait(id, large = false) {
  const c = getCharacter(id);
  return `<div class="${large ? 'hero-art' : 'companion-art'}" role="img" aria-label="${c.name}" style="--atlas-height:${id === 'grove' ? 261.25 : 285}%;--portrait-ratio:${313.5 / (id === 'grove' ? 480 : 440)};background-image:url('${import.meta.env.BASE_URL}art/survivor/${c.art}')"></div>`;
}
// One target serves departure, journal and results; explicit collection goals win.
export function campMission(profile) {
  const entries = codexEntries(profile);
  const entryMission = (entry, label) => ({id: entry.id, title: entry.name, detail: entry.hint, label});
  const explicit = entries.find(e => e.id === profile.goal) ?? entries.find(e => e.id === `branch:${profile.experiment}`);
  if (explicit) return entryMission(explicit, '이번 판 목표');
  const companion = entries.find(e => e.group === 'companions' && !e.found);
  if (companion) return {...entryMission(companion, '다음 해금'), title: `${companion.name} 합류`, detail: unlockProgress(profile, companion.id.split(':')[1])};
  const challenge = CHALLENGES.find(c => challengeProgress(profile, c) < c.target);
  if (challenge) return {id: `keepsake:${challenge.reward}`, title: KEEPSAKES[challenge.reward].name, detail: `${challenge.name} ${challengeProgress(profile, challenge)}/${challenge.target} · ${challenge.description}`, label: '다음 보상'};
  const missing = entries.find(e => !e.found);
  return missing ? entryMission(missing, '도감 추천') : {id:`companion:${profile.selected}`,title:'동료의 숙련 인장',detail:'다른 동료로 전문화·진화·군주 격파에 도전하세요.',label:'다음 여정'};
}
export function nextGoal(profile) {
  const mission = campMission(profile);
  return `${mission.title} · ${mission.detail}`;
}
function preparationLinks(game, profile, active) {
  const tabs = [
    ['inheritance', '전투법', game.inheritance ? SPECIALIZATIONS[game.inheritance].name : '자유로운 출발'],
    ['keepsake', '기념품', KEEPSAKES[profile.keepsake].name],
    ['vow', '서약', vowStats(game.vow).name]
  ];
  return `<nav class="preparation-links" role="tablist" aria-label="출발 장비 선택">${tabs.map(([id,label,value])=>`<button id="prepare-tab-${id}" role="tab" data-preparation-tab="${id}" aria-selected="${active === id}" aria-controls="prepare-${id}" tabindex="${active === id ? 0 : -1}"><small>${label}</small><strong>${value}</strong></button>`).join('')}</nav>`;
}
export function storageNotice(warning) {
  return warning ? `<p class="storage-note" role="status">${warning}</p>` : '';
}
export function relicContextMarkup(game, key, showLabel = true) {
  const context = relicContext(game, key);
  return `<span class="relic-context is-${context.kind}">${showLabel ? `<b>${context.label}</b>` : ''}<span>${context.detail}</span></span>`;
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
  return `<section class="run-discoveries" aria-label="이번 판의 새 발견"><strong>이번 판에 새로 발견했어요</strong><div class="discoveries">${items.map(item => `<article class="found discovery-trophy">${collectionArt(item.key)}<div><small>새 기록 · ${item.kind}</small><strong>${item.name}</strong></div></article>`).join('')}</div><p class="record-line">발견한 전문화는 출발 준비에서 전승해 처음부터 사용할 수 있습니다. 전투 발견 3개를 모으면 초반 성장을 돕는 기념품이 열립니다.</p><button class="secondary discovery-review" data-review-discoveries="${items[0].id}">도감에서 새 발견 보기 →</button></section>`;
}
export function nextExperimentCard(game, profile) {
  const key = nextExperiment(game, profile);
  if (!key || !isUnlocked(profile, game.characterId)) return '';
  const target = SPECIALIZATIONS[key];
  return `<section class="next-experiment" aria-label="다음 판의 실험"><small>다음 판의 실험 · ${profile.buildDiscoveries.includes(key) ? '다른 갈래로 도전' : '아직 발견하지 않은 갈래'}</small><strong>${target.name}</strong><p>${target.description}</p><p class="experiment-change">${target.change}</p><button class="secondary" data-experiment="${key}">이 빌드로 다음 판 준비</button><p class="record-line">${getCharacter(game.characterId).name} · 전승 없이 출발해 ${UPGRADE_META[target.weapon].name} 3단계 · 레벨 4부터 선택 후보를 기다립니다.${profile.goal ? ' 기존 도감 목표를 이 목표로 바꿉니다.' : ''}</p></section>`;
}
export function journeyScreen(profile) {
  const completed = completedChallenges(profile);
  const next = CHALLENGES.find(c => !completed.includes(c));
  return `<details class="journey-board"><summary>숲의 도전 <span>${completed.length}/${CHALLENGES.length} 완료 · 기념품 해금</span></summary><p class="record-line">여정을 마치면 도전이 기록됩니다. 해금한 기념품은 출발 준비에서 선택하세요.</p><div class="challenge-list">${CHALLENGES.map(c => {
    const progress = challengeProgress(profile, c), done = progress === c.target;
    return `<article class="challenge-row ${done ? 'complete' : ''}" data-challenge="${c.id}"><strong>${c.name} <span>${done ? '완료' : `${progress}/${c.target}`}</span></strong><p>${c.description}</p><small>보상 · ${KEEPSAKES[c.reward].name}</small><progress value="${progress}" max="${c.target}" aria-label="${c.name} 진행도"></progress></article>`;
  }).join('')}</div></details><p class="journey-preview">${next ? `다음 도전 · ${next.name} ${challengeProgress(profile, next)}/${next.target} · 보상: ${KEEPSAKES[next.reward].name}` : `숲의 도전 ${CHALLENGES.length}개 완료 · 해금한 기념품은 출발 준비에서 선택하세요.`}</p>`;
}
function inheritanceSelection(game, profile) {
  const branches = primaryBranches(game.characterId);
  return `<section data-preparation-section="inheritance" class="inheritance-selection" aria-labelledby="inheritance-title"><div class="companion-heading"><h2 id="inheritance-title">전투법 전승</h2><span>하나의 갈래로 출발</span></div><div class="inheritance-grid" role="group" aria-label="시작 전투법"><button class="inheritance-card" data-inheritance="none" aria-pressed="${!game.inheritance}"><strong>자유로운 출발</strong><span>전투 중 두 갈래에서 선택</span><b class="selection-mark" aria-hidden="true">${!game.inheritance ? '✓' : '○'}</b></button>${branches.map(key => {
    const item = SPECIALIZATIONS[key], unlocked = !!validInheritance(profile, game.characterId, key);
    return `<button class="inheritance-card" data-inheritance="${key}" aria-pressed="${game.inheritance === key}" ${unlocked ? '' : 'disabled'}>${collectionArt(key, !unlocked)}<span class="inheritance-copy"><strong>${item.name}</strong><span>${unlocked ? item.change : `${UPGRADE_META[item.weapon].name} 3단계 후 성장 선택에서 발견`}</span><small>${game.inheritance === key ? '1단계부터 이 전투법으로 시작' : unlocked ? '선택해 전승하기' : '미발견'}</small></span>${game.inheritance === key ? '<b class="selection-mark" aria-hidden="true">✓</b>' : ''}</button>`;
  }).join('')}</div><p class="record-line">전승한 갈래는 이번 판에 고정됩니다. 무기와 진화는 여정에서 성장시켜요.</p></section>`;
}
function companionRoster(game, profile) {
  return `<div class="companion-roster"><div class="companion-heading"><h2>숲에 함께할 동료</h2><span>${Object.keys(CHARACTERS).filter(id => isUnlocked(profile, id)).length} / 3</span></div><div class="companion-grid" role="group" aria-label="동료 선택">${Object.values(CHARACTERS).map(char => {
    const unlocked = isUnlocked(profile, char.id), selected = game.characterId === char.id;
    return `<button class="companion-card" data-character="${char.id}" aria-pressed="${selected}" ${unlocked ? '' : 'disabled'} style="--tone:${char.color}">${portrait(char.id)}<span class="companion-copy"><strong>${char.name}</strong><small>${UPGRADE_META[char.weapon].name} 시작</small><span>${unlocked ? selected ? '선택한 동료' : char.title : unlockProgress(profile, char.id)}</span></span></button>`;
  }).join('')}</div></div>`;
}
function departureKit(game, profile) {
  return `<section data-preparation-section="keepsake" class="departure-kit" aria-labelledby="keepsake-title"><div class="companion-heading"><h2 id="keepsake-title">출발 기념품</h2><span>하나를 골라 가져가세요</span></div><div class="keepsake-grid" role="group" aria-label="출발 기념품">${Object.entries(KEEPSAKES).map(([id, item]) => {
    const unlocked = canEquipKeepsake(profile, id), challenge = CHALLENGES.find(c => c.reward === id);
    return `<button class="keepsake-card" data-keepsake="${id}" aria-pressed="${profile.keepsake === id}" ${unlocked ? '' : 'disabled'}><span class="keepsake-art">${collectionArt(id, !unlocked)}</span><span class="keepsake-copy"><strong>${item.name}</strong><span>${item.change}</span><small>${unlocked ? profile.keepsake === id ? '이번 출발에 선택됨' : '선택하기' : `${challenge.name} ${challengeProgress(profile, challenge)}/${challenge.target}`}</small></span></button>`;
  }).join('')}</div></section>`;
}
function masteryBoard(game, profile) {
  const c = getCharacter(game.characterId), count = masteryCount(profile, c.id);
  return `<details class="mastery-board"><summary>${c.name}의 숙련 <span>${count}/3 인장 · 성장 다시 뽑기 ${game.rerolls}회</span></summary><p class="record-line">이 동료로 달성한 기록이 남습니다. 인장 3개를 모으면 이 동료의 다시 뽑기가 매 판 1회 늘어납니다.</p><div class="mastery-seals">${masteryProgress(profile, c.id).map(seal => `<article class="${seal.current >= seal.target ? 'complete' : ''}"><strong>${seal.name}</strong><span>${seal.current}/${seal.target}</span></article>`).join('')}</div><p class="record-line">${UPGRADE_META[c.weapon].name}의 두 전문화를 서로 다른 판에서 선택 · ${UPGRADE_META[c.evolution].name} 진화 · 군주 격파</p>${profile.characters[c.id].vowWins ? `<p class="record-line">짙은 안개 군주 격파 ${profile.characters[c.id].vowWins}회</p>` : ''}</details>`;
}
function vowSelection(game, profile) {
  return `<section data-preparation-section="vow" class="vow-selection" aria-label="숲의 서약"><div class="companion-heading"><h2>숲의 서약</h2><span>첫 군주 격파 후 도전 해금</span></div><div class="vow-options" role="group" aria-label="여정 난이도">${Object.entries(VOWS).map(([id, vow]) => `<button class="secondary" data-vow="${id}" aria-pressed="${game.vow === id}" ${canTakeVow(profile, id) ? '' : 'disabled'}><strong>${vow.name}</strong><span>${vow.change}</span>${canTakeVow(profile, id) ? '' : '<small>군주를 한 번 쓰러뜨리면 열립니다</small>'}</button>`).join('')}</div><p class="record-line">도전 격파 기록은 동료별로 남습니다. 경험치 보너스는 기념품과 합산합니다.</p></section>`;
}
function goalPlan(game, profile) {
  const meta = goalMeta(game.goal);
  if (!meta) return '';
  const entry = codexEntries(profile).find(e => e.id === game.goal);
  return `<section class="experiment-plan" aria-label="도감 수집 목표"><small>이번 판의 도감 목표</small><strong>${meta.name}</strong><p>${entry.hint}</p><p class="record-line">획득한 뒤 여정을 마치면 기록됩니다. 쓰러져도 발견은 남아요.</p><button class="secondary" data-clear-goal>수집 목표 지우기</button></section>`;
}
export function campScreen(game, profile, warning, section = 'prepare', preparation = 'inheritance') {
  const c = getCharacter(game.characterId), record = profile.characters[c.id];
  const entries = codexEntries(profile), found = entries.filter(e => e.found).length;
  const k = keepsakeStats(profile.keepsake), mastery = masteryCount(profile, c.id), mission = campMission(profile);
  return `${appHeader('잿빛의 숲')}${appNavigation(section, found, entries.length, profile)}
  <div class="camp-content"><aside class="camp-stage" aria-label="선택한 동료와 전투 방식"><div class="camp-scene" aria-hidden="true"><div class="camp-stage-light"></div><img class="hero-art camp-portrait" src="${import.meta.env.BASE_URL}art/survivor/portrait-${c.id}-v1.webp" width="1024" height="1536" alt="" decoding="async"></div><div class="camp-stage-caption"><small>${UPGRADE_META[c.weapon].name} · 체력 ${game.player.maxHp} · 이동 ${c.speed + k.speed}</small><strong>${c.name}</strong><span>${c.title}</span></div>${companionRoster(game, profile)}<button class="camp-mastery-link" data-camp-section="journal">숙련 인장 ${mastery}/3 <span>다시 뽑기 ${game.rerolls}회 →</span></button>
  <div class="camp-stage-note"><p>${companionRhythm[c.id]}</p></div></aside>
  <section class="camp-controls camp-section" aria-label="출발 준비" ${section === 'prepare' ? '' : 'hidden'}>
  ${preparationLinks(game, profile, preparation)}<div class="preparation-editor" tabindex="0" role="region" aria-label="준비 선택 목록">
  <div id="prepare-inheritance" role="tabpanel" aria-labelledby="prepare-tab-inheritance" ${preparation === 'inheritance' ? '' : 'hidden'}>${inheritanceSelection(game, profile)}<details class="companion-detail companion-guide"><summary>${c.name}의 전투 방식</summary><strong>${SIGNATURES[c.id].name} <span>${UPGRADE_META[c.weapon].name} · ${c.trait}</span></strong><p class="companion-signature">${companionRhythm[c.id]}</p><p>${c.description}</p><p>${SIGNATURES[c.id].description}</p></details></div>
  <div id="prepare-keepsake" role="tabpanel" aria-labelledby="prepare-tab-keepsake" ${preparation === 'keepsake' ? '' : 'hidden'}>${departureKit(game, profile)}</div>
  <div id="prepare-vow" role="tabpanel" aria-labelledby="prepare-tab-vow" ${preparation === 'vow' ? '' : 'hidden'}>${vowSelection(game, profile)}</div>
  ${game.goal || game.experiment ? `<div class="camp-objective">${goalPlan(game, profile)}${experimentPlan(game)}</div>` : ''}</div></section>
  <section class="camp-journal camp-section" aria-label="숙련과 여정 기록" ${section === 'journal' ? '' : 'hidden'}><div class="journal-heading"><p class="eyebrow">여정의 기록</p><h2>지난 여정이 다음 힘이 됩니다</h2><p>발견과 해금은 쓰러져도 남습니다.</p></div>${masteryBoard(game, profile)}${journeyScreen(profile)}
  <details class="camp-records"><summary>여정 기록 <span>${profile.runs}회 도전 · ${profile.wins}회 군주 격파</span></summary><p class="next-goal">${nextGoal(profile)}</p><p class="record-line">전문화 발견 ${profile.buildDiscoveries.length}/6 · 유물 발견 ${profile.relicDiscoveries.length}/6</p><p class="record-line">${c.name} · 최고 ${record.bestKills} 처치 · 최장 ${formatTime(record.bestTime)}${record.fastestWin === null ? '' : ` · 최단 격파 ${formatTime(record.fastestWin)}`}</p><div class="discoveries">${Object.keys(EVOLUTIONS).map(id => `<span class="${profile.discoveries.includes(id) ? 'found' : ''}">${profile.discoveries.includes(id) ? '발견' : '미발견'} · ${UPGRADE_META[id].name}</span>`).join('')}</div>${profile.history.length ? `<ol class="run-history">${profile.history.map(row => `<li><span>${getCharacter(row.character).name} · ${outcomeName[row.outcome]}${row.vow === 'mist' ? ' · 짙은 안개' : ''}</span><span>${formatTime(row.time)} · ${row.kills} 처치</span></li>`).join('')}</ol>` : '<p class="record-line">첫 여정을 시작하면 기록이 남습니다.</p>'}</details></section></div>${storageNotice(warning)}
  <footer class="camp-departure"><button class="camp-mission" data-open-entry="${mission.id}"><span>${mission.label}</span><strong>${mission.title}</strong><small>${mission.detail}</small><b aria-hidden="true">→</b></button><p class="departure-summary"><strong>${c.name} · 체력 ${game.player.maxHp} · 이동 ${c.speed + k.speed}</strong><span>${game.inheritance ? SPECIALIZATIONS[game.inheritance].name : '자유로운 출발'} · ${k.name}</span></p><div><button id="start-game" class="primary">숲에 들어가기 <span aria-hidden="true">→</span></button><p class="controls-note"><span class="keyboard-copy">WASD / 방향키 이동 · Esc 일시정지</span><span class="touch-copy">왼쪽 조이스틱 이동 · 공격은 자동</span></p></div></footer>`;
}
export function buildSummary(game) {
  const branches = Object.keys(SPECIALIZATIONS).filter(key => game.ranks[key]);
  const progress = experimentProgress(game), collectionGoal = goalProgress(game);
  const k = keepsakeStats(game.keepsake);
  const growth = k.xpSeconds ? ` · ${game.time < k.xpSeconds ? `효과 ${Math.ceil(k.xpSeconds - game.time)}초 남음` : '경험치 강화 종료'}` : '';
  return `<div class="build-summary">${collectionGoal ? `<p class="experiment-progress is-${collectionGoal.state}"><strong>도감 목표</strong> ${game.phase === 'ended' && collectionGoal.state === 'complete' ? `${collectionGoal.name} 달성 · 도감 기록 완료` : collectionGoal.text}</p>` : ''}<p><strong>숲의 서약</strong> ${vowStats(game.vow).name} · ${vowStats(game.vow).change}</p><p><strong>성장 다시 뽑기</strong> ${game.rerollsUsed}회 사용 · ${game.rerolls}회 남음</p>${progress ? `<p class="experiment-progress is-${progress.state}"><strong>이번 판의 목표</strong> ${progress.text}</p>` : ''}<p><strong>출발 기념품</strong> ${k.name} · ${k.change}${growth}</p><p><strong>이번 판의 전문화</strong> ${branches.length ? branches.map(key => SPECIALIZATIONS[key].name).join(' · ') : '무기 3단계부터 선택할 수 있습니다'}</p><p><strong>숲의 유물 ${game.relics.length}/2</strong> ${game.relics.length ? game.relics.map(key => RELICS[key].name).join(' · ') : '제단 또는 저주 상자를 완료하면 얻습니다'}</p>${branches.map(key => `<small>${SPECIALIZATIONS[key].name} · ${SPECIALIZATIONS[key].change}</small>`).join('')}${game.relics.map(key => `<small>${RELICS[key].name} · ${RELICS[key].change}</small>`).join('')}</div>`;
}
// Present only the deltas returned by recordRun, never everything already owned.
export function resultTakeaway(game, profile, rewards = {}) {
  const discoveries = rewards.discoveries ?? {};
  const entries = codexEntries(profile);
  const counts = [
    {label: '새 발견', value: ['branches', 'evolutions', 'relics'].reduce((n, key) => n + (discoveries[key]?.length ?? 0), 0)},
    {label: '동료 합류', value: rewards.unlocked?.length ?? 0},
    {label: '기념품 해금', value: rewards.challenges?.length ?? 0},
    {label: '숙련 인장', value: rewards.mastery?.length ?? 0}
  ].filter(row => row.value);
  const keepsake = CHALLENGES.find(c => rewards.challenges?.includes(c.id))?.reward;
  const discovery = discoveries.branches?.[0] ? `branch:${discoveries.branches[0]}` :
    discoveries.evolutions?.[0] ? `evolution:${discoveries.evolutions[0]}` :
      discoveries.relics?.[0] ? `relic:${discoveries.relics[0]}` : null;
  const id = keepsake ? `keepsake:${keepsake}` :
    rewards.unlocked?.[0] ? `companion:${rewards.unlocked[0]}` : discovery;
  const entry = entries.find(e => e.id === id);
  let feature;
  if (entry) {
    feature = {
      id, title: entry.name, detail: entry.change || entry.description,
      label: keepsake ? '다음 출발에 가져갈 수 있어요' : id.startsWith('companion:') ? '새로운 시작 무기가 열렸어요' : game.outcome === 'defeat' ? '쓰러져도 이 발견은 남아요' : '이번 여정의 발견을 도감에 새겼어요',
      action: keepsake ? '기념품 준비하기' : id.startsWith('companion:') ? '새 동료 살펴보기' : '발견한 도감 펼치기',
      preparation: keepsake ? 'keepsake' : null, keepsake
    };
  } else if (rewards.mastery?.length) {
    const count = masteryCount(profile, game.characterId);
    feature = {title: `${getCharacter(game.characterId).name}의 숙련`, label: '새 숙련 인장을 얻었어요',
      detail: count === 3 ? '인장 3개 완성 · 다음 출발부터 성장 다시 뽑기 2회' : `인장 ${count}/3 · 모두 모으면 성장 다시 뽑기 +1회`,
      action: '숙련 기록 살펴보기', preparation: 'journal'};
  } else {
    const mission = campMission(profile);
    feature = {...mission, detail: mission.detail, action: '목표와 발견 방법 보기'};
  }
  const tips = {
    hunt: '사냥개가 몸을 낮추면 달려오는 방향의 옆으로 피하세요.',
    spore: '버섯이 남긴 포자 원은 잠시 기다렸다 지나가세요.',
    contact: '적의 무리 한가운데보다 가장자리를 따라 이동해 보세요.',
    slam: '내려찍기 전에 원 밖으로 빠져나오세요.',
    charge: '군주의 돌진 방향 옆으로 이동해 공격 뒤 빈틈을 노려보세요.',
    thorns: '가시 사이의 빈 공간으로 조금씩 이동해 보세요.'
  };
  const dominant = Object.entries(game.damageTaken).sort((a, b) => b[1] - a[1])[0];
  const tip = game.outcome === 'defeat' && dominant?.[1] > 0 ? tips[dominant[0]] : null;
  const names = [
    [...(discoveries.branches ?? []).map(k => SPECIALIZATIONS[k].name),
      ...(discoveries.evolutions ?? []).map(k => UPGRADE_META[k].name),
      ...(discoveries.relics ?? []).map(k => RELICS[k].name)],
    (rewards.unlocked ?? []).map(k => CHARACTERS[k].name),
    (rewards.challenges ?? []).map(k => KEEPSAKES[CHALLENGES.find(c => c.id === k).reward].name),
    masteryProgress(profile, game.characterId).filter(s => rewards.mastery?.includes(s.id)).map(s => s.name)
  ];
  const earned = ['새 발견', '동료 합류', '기념품 해금', '숙련 인장']
    .map((label, i) => ({label, names: names[i]})).filter(row => row.names.length);
  return {counts, feature, tip, earned};
}
export function resultOverview(game, profile, rewards) {
  const {counts, feature, tip, earned} = resultTakeaway(game, profile, rewards);
  const art = feature.id?.startsWith('companion:') ? portrait(feature.id.split(':')[1]) : collectionArt(feature.id) || codexIcon('book');
  const action = feature.preparation ? `data-result-preparation="${feature.preparation}"${feature.keepsake ? ` data-result-keepsake="${feature.keepsake}"` : ''}` : `data-result-entry="${feature.id}"`;
  return `<section class="result-takeaway" aria-label="이번 여정에 남은 것"><div class="result-earned"><h2>${counts.length ? '이번 여정에 남은 것' : '다음 장을 준비하세요'}</h2>${counts.length ? `<ul class="earned-tokens">${earned.map((row,i) => `<li style="--reveal:${i * 70}ms"><small>${row.label} <b>${row.names.length}</b></small><strong title="${row.names.join(' · ')}">${row.names[0]}${row.names.length > 1 ? ` <span>외 ${row.names.length - 1}개</span>` : ''}</strong></li>`).join('')}</ul>` : '<p>새 발견은 없지만, 여정 기록은 남았습니다.</p>'}</div><div class="result-next-step"><div class="result-reward-art" aria-hidden="true">${art}</div><div><small>${feature.label}</small><h3>${feature.title}</h3><p>${feature.detail}</p><button class="secondary" ${action}>${feature.action} <span aria-hidden="true">→</span></button></div></div>${tip ? `<p class="result-coaching"><strong>다음엔 이렇게</strong> ${tip}</p>` : ''}</section>`;
}
export function resultDetails(game, profile, unlocked, warning, challenges = [], discoveries = null, mastery = []) {
  const total = Object.values(game.damageDealt).reduce((sum, n) => sum + n, 0);
  return `${storageNotice(warning)}${resultOverview(game, profile, {unlocked, challenges, discoveries, mastery})}${runDiscoveries(discoveries)}${mastery.length ? `<section class="mastery-reward" role="status"><strong>${getCharacter(game.characterId).name} · 새 숙련 인장</strong><p>${masteryProgress(profile, game.characterId).filter(s => mastery.includes(s.id)).map(s => s.name).join(' · ')}</p><span>${masteryCount(profile, game.characterId) === 3 ? '숙련 완료! 다음 출발부터 성장 다시 뽑기 2회' : `숙련 ${masteryCount(profile, game.characterId)}/3 · 인장 3개로 다시 뽑기 +1회`}</span></section>` : ''}${game.outcome === 'victory' && game.vow === 'mist' ? `<p class="vow-victory">짙은 안개 격파 · ${getCharacter(game.characterId).name}의 도전 기록 ${profile.characters[game.characterId].vowWins}회</p>` : ''}${challenges.length ? `<div class="challenge-reward" role="status"><strong>숲의 도전 완료 · 새 기념품 해금</strong>${challenges.map(id => CHALLENGES.find(c => c.id === id)).map(c => `<p>${c.name} → ${KEEPSAKES[c.reward].name}<small>${KEEPSAKES[c.reward].change}</small></p>`).join('')}<span>출발 준비 → 기념품에서 다음 출발에 장착하세요.</span></div>` : ''}${unlocked.length ? `<div class="unlock-reward"><strong>새로운 동료가 합류했습니다</strong><span>${unlocked.map(id => CHARACTERS[id].name).join(' · ')}</span><p>출발 준비에서 새로운 시작 무기를 만나보세요.</p></div>` : ''}
  ${nextExperimentCard(game, profile)}<details class="run-notes"><summary>이번 판의 장비와 성장 기록</summary>${buildSummary(game)}</details>
  <details class="battle-record"><summary>무기가 활약한 기록</summary><p class="record-line">${SIGNATURES[game.characterId].name} ${game.signature.activations}회 발동${game.signature.absorbed ? ` · 보호막으로 피해 ${Math.round(game.signature.absorbed)} 흡수` : ''}${game.inheritance ? ` · ${SPECIALIZATIONS[game.inheritance].name} 전승으로 출발` : ''}</p><p class="record-line">받은 피해 ${Math.round(Object.values(game.damageTaken).reduce((a, b) => a + b, 0))} · 회복한 체력 ${Math.round(Object.values(game.healing).reduce((a, b) => a + b, 0))}</p>${['sword', 'ember', 'orbit'].filter(k => game.ranks[k] > 0).map(k => {
    const percent = total ? Math.round(game.damageDealt[k] / total * 100) : 0;
    return `<div class="damage-row"><span>${weaponName(game, k)}</span><b>${Math.round(game.damageDealt[k]).toLocaleString('ko-KR')} <small>(${percent}%)</small></b><i style="--share:${percent}%;--tone:${UPGRADE_META[k].color}"></i></div>`;
  }).join('')}${game.damageDealt.relic ? `<p class="record-line">가시 심장 피해 ${Math.round(game.damageDealt.relic)}</p>` : ''}</details>`;
}
