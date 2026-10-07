import { CHAMPIONS, championStatus } from './champions.js';
import { SIGNATURES, signatureState } from './signature.js';
import { attackPose, isEvolvedWeapon, hurtFeedback } from './impact.js';
import { GIANT } from './enemies.js';
import { combatPacing } from './pacing.js';
import { validExperiment, nextExperiment, experimentProgress } from './experiments.js';
import { runPreparation, validInheritance, primaryBranches, canTakeVow, validGoal, goalFound } from './progression.js';
import { goalProgress, goalRelevant } from './goals.js';
import { canEquipKeepsake } from './journey.js';
import { specializationFor, SPECIALIZATIONS, RELICS } from './expansion.js';
import { ENCOUNTERS, trackedEncounter, encounterDirection, encounterDistance, nearbyChest, openChest, chooseCurse, chooseRelic, inspectEncounter, closeEncounterPreview } from './encounters.js';
import './style.css';
import './folio.css';
import { BOSS, bossAttackLabel } from './boss.js';
import { createGame, startGame, updateGame, chooseUpgrade, canReroll, rerollUpgrades, pauseGame, resumeGame, spawnEnemy, spawnBoss, UPGRADE_META, upgradeChange, xpForLevel, canEvolve, weaponName, EVOLUTIONS, nextEvolution, RUN_SECONDS } from './game.js';
import { loadArt, createRenderer } from './render.js';
import { getCharacter, isUnlocked } from './characters.js';
import { loadProfile, saveProfile, recordRun } from './profile.js';
import { campScreen, resultDetails, formatTime, buildSummary, relicContextMarkup, encounterRewardPreview, portrait } from './camp.js';
import { codexScreen, CODEX_GROUPS, codexEntries } from './codex.js';
import { collectionArt } from './collection-art.js';
import { weaponPresentation, weaponLoadout, weaponBeltKey } from './weapon-presentation.js';
import { createAudio, selectAudioEvents } from './audio.js';
import { nearestRecovery, RECOVERY } from './field.js';
const $ = id => document.getElementById(id);
const paths = {
  sword: 'M5 19 17 7M13 4l7-1-1 7-5 5-5-5zM4 14l6 6M3 21l3-3',
  ember: 'M13 2c1 5-3 6-2 10 2-1 3-3 4-4 4 5 6 13-3 14-10-1-10-8-5-13-1 4 1 5 2 5-1-5 3-6 4-12z',
  orbit: 'M12 7l3 5-3 5-3-5zM6 5c-5 4-4 12 2 15M18 19c5-4 4-12-2-15M4 5h3V2M20 19h-3v3',
  fleet: 'M14 3 5 14h7l-2 7 10-12h-8z',
  magnet: 'M5 3v9a7 7 0 0 0 14 0V3h-5v9a2 2 0 0 1-4 0V3zM5 7h5M14 7h5',
  heart: 'M12 21S2 14 2 7a5 5 0 0 1 10-2 5 5 0 0 1 10 2c0 7-10 14-10 14z',
  pause: 'M8 5v14M16 5v14',
  sound: 'M4 9h4l5-5v16l-5-5H4zM17 8c2 2 2 6 0 8M20 5c4 4 4 10 0 14',
  mute: 'M4 9h4l5-5v16l-5-5H4zM17 9l5 6M22 9l-5 6',
  star: 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] ?? paths.star}"/></svg>`;
let storage;
try {
  storage = window.localStorage;
} catch {}
const loaded = loadProfile(storage);
let profile = loaded.profile,
  storageWarning = loaded.warning;
function persist() {
  if (loaded.canSave && !saveProfile(storage, profile)) storageWarning = '기록을 저장하지 못했습니다. 이 창을 닫기 전까지 기록과 해금이 유지됩니다.';
}
let game = createGame(Date.now(), profile.selected, profile.keepsake, profile.experiment, runPreparation(profile)),
  renderer = null,
  lastPhase = null,
  lastHud = 0,
  noticeUntil = 0,
  last = 0,
  accumulator = 0;
let stick = {
    x: 0,
    y: 0,
    id: null
  },
  seed = Date.now(),
  sound = true;
const audio = createAudio();
const keys = new Set();
let campView = 'prepare', campSection = 'prepare', codexFilter = 'all', codexSelection = null, campScroll = 0;
let qaPilot = null;
try {
  sound = localStorage.getItem('ash-sound') !== 'off';
} catch {/* Private storage can be unavailable. */}
function resetInput() {
  keys.clear();
  stick = {
    x: 0,
    y: 0,
    id: null
  };
  $('touch').style.setProperty('--x', '0px');
  $('touch').style.setProperty('--y', '0px');
}
function initAudio() {
  if (sound && !audio.unlock()) {
    sound = false;
    updateSound();
  }
}
function tone(event) {
  const weapon = ['swing', 'blade-impact'].includes(event) ? 'sword' : ['ember-shot', 'ember-impact'].includes(event) ? 'ember' : ['rune-hit', 'pulse'].includes(event) ? 'orbit' : null;
  if (sound) audio.play(event, weapon ? specializationFor(game, weapon) : null, isEvolvedWeapon(game, weapon));
}
function updateSound() {
  $('sound').innerHTML = icon(sound ? 'sound' : 'mute');
  $('sound').setAttribute('aria-label', sound ? '소리 끄기' : '소리 켜기');
  $('sound').setAttribute('aria-pressed', String(sound));
}
function notice(text) {
  $('notice').textContent = text;
  noticeUntil = performance.now() + 2600;
  $('notice').classList.add('show');
}
function start() {
  game.runId ??= crypto.randomUUID();
  renderer?.clearCelebration();
  initAudio();
  resetInput();
  startGame(game);
  syncPhase();
}
function restart() {
  game = createGame(++seed, game.characterId, profile.keepsake, profile.experiment, runPreparation(profile, game.characterId));
  start();
  last = 0;
  accumulator = 0;
  lastHud = 0;
}
function camp() {
  campView = 'prepare';
  game = createGame(++seed, profile.selected, profile.keepsake, profile.experiment, runPreparation(profile));
  lastPhase = null;
  syncPhase();
  last = 0;
  accumulator = 0;
}
function selectCharacter(id) {
  if (game.phase !== 'ready' || !isUnlocked(profile, id)) return;
  profile.selected = id;
  profile.inheritances[id] = runPreparation(profile, id).inheritance;
  profile.experiment = validExperiment(id, profile.experiment);
  persist();
  camp();
  requestAnimationFrame(() => $('panel').querySelector(`[data-character="${id}"]`)?.focus({
    preventScroll: true
  }));
}
function prepareExperiment(key) {
  if (game.phase !== 'ended' || !isUnlocked(profile, game.characterId) || key !== nextExperiment(game, profile)) return;
  profile.selected = game.characterId;
  profile.experiment = validExperiment(game.characterId, key);
  profile.inheritances[game.characterId] = null;
  profile.goal = null;
  persist();
  campSection = 'prepare';
  camp();
  $('start-game').scrollIntoView({block: 'end'});
}
function clearExperiment() {
  if (game.phase !== 'ready') return;
  profile.experiment = null;
  persist();
  camp();
}
function selectInheritance(key, id = game.characterId) {
  if (game.phase !== 'ready' || key !== 'none' && !validInheritance(profile, id, key)) return;
  const scroll = $('panel').querySelector('.camp-controls')?.scrollTop ?? 0;
  profile.selected = id; campView = 'prepare'; campSection = 'prepare';
  profile.inheritances[id] = key === 'none' ? null : key;
  profile.experiment = null;
  if (profile.goal?.startsWith('branch:') && primaryBranches(id).includes(profile.goal.slice(7))) profile.goal = null;
  persist(); camp();
  $('panel').querySelector('.camp-controls').scrollTop = scroll;
  requestAnimationFrame(() => $('panel').querySelector(`[data-inheritance="${key}"]`)?.focus({preventScroll: true}));
}
function selectKeepsake(id) {
  if (game.phase !== 'ready' || !canEquipKeepsake(profile, id)) return;
  const scrollTop = $('panel').querySelector('.camp-controls')?.scrollTop ?? 0;
  const journeyOpen = $('panel').querySelector('.journey-board')?.open;
  profile.keepsake = id;
  persist();
  camp();
  $('panel').querySelector('.journey-board').open = journeyOpen;
  $('panel').querySelector('.camp-controls').scrollTop = scrollTop;
  requestAnimationFrame(() => $('panel').querySelector(`[data-keepsake="${id}"]`)?.focus({preventScroll:true}));
}
function openCodex() {
  if (game.phase !== 'ready') return;
  campScroll = $('panel').querySelector(campSection === 'journal' ? '.camp-journal' : '.camp-controls')?.scrollTop ?? 0;
  campView = 'codex';
  lastPhase = null; syncPhase();
}
function selectVow(id) {
  if (game.phase !== 'ready' || !canTakeVow(profile, id)) return;
  const scroll = $('panel').querySelector('.camp-controls')?.scrollTop ?? 0;
  profile.vow = id; persist(); camp();
  $('panel').querySelector('.camp-controls').scrollTop = scroll;
  requestAnimationFrame(() => $('panel').querySelector(`[data-vow="${id}"]`)?.focus({preventScroll: true}));
}
function selectGoal(id) {
  if (game.phase !== 'ready' || id !== null && (!validGoal(id) || goalFound(profile, id))) return;
  const scroll = $('panel').scrollTop;
  const codexScroll = ['.codex-grid', '.codex-layout', '.codex-detail'].map(selector => [selector, $('panel').querySelector(selector)?.scrollTop ?? 0]);
  profile.goal = profile.goal === id ? null : id;
  if (profile.goal?.startsWith('branch:') && primaryBranches(game.characterId).includes(profile.goal.slice(7))) profile.inheritances[game.characterId] = null;
  profile.experiment = null;
  persist();
  game = createGame(++seed, profile.selected, profile.keepsake, null, runPreparation(profile));
  lastPhase = null; syncPhase();
  $('panel').scrollTop = scroll;
  for (const [selector, top] of codexScroll) { const element = $('panel').querySelector(selector); if (element) element.scrollTop = top; }
  requestAnimationFrame(() => $('panel').querySelector(campView === 'codex' ? '[data-codex-goal]' : '[data-open-codex]')?.focus({preventScroll: true}));
}
function closeCodex() {
  if (game.phase !== 'ready' || campView !== 'codex') return;
  campView = 'prepare';
  lastPhase = null; syncPhase();
  $('panel').querySelector(campSection === 'journal' ? '.camp-journal' : '.camp-controls').scrollTop = campScroll;
  requestAnimationFrame(() => $('panel').querySelector('[data-open-codex]')?.focus({preventScroll: true}));
}
function changeCampSection(section) {
  if (game.phase !== 'ready' || campView !== 'prepare' || !['prepare', 'journal'].includes(section)) return;
  campSection = section;
  lastPhase = null; syncPhase();
  requestAnimationFrame(() => $('panel').querySelector(`.camp-tabs [data-camp-section="${section}"]`)?.focus({preventScroll: true}));
}
function updateCodex(filter, entry) {
  if (game.phase !== 'ready' || campView !== 'codex') return;
  if (filter && !Object.hasOwn(CODEX_GROUPS, filter)) return;
  if (entry && !codexEntries(profile).some(e => e.id === entry)) return;
  const gridScroll = $('panel').querySelector('.codex-grid').scrollTop;
  const bodyScroll = $('panel').querySelector('.codex-layout').scrollTop;
  if (filter) { codexFilter = filter; codexSelection = null; }
  if (entry) codexSelection = entry;
  lastPhase = null; syncPhase();
  $('panel').querySelector('.codex-grid').scrollTop = filter ? 0 : gridScroll;
  $('panel').querySelector('.codex-layout').scrollTop = filter ? 0 : bodyScroll;
  requestAnimationFrame(() => {
    if (entry && matchMedia('(max-width:680px)').matches) {
      $('panel').querySelector('.codex-detail h2')?.focus({preventScroll: true});
      $('panel').querySelector('.codex-layout').scrollTop = 0;
    } else $('panel').querySelector(filter ? `[data-codex-filter="${filter}"]` : `[data-codex-entry="${entry}"]`)?.focus({preventScroll: true});
  });
}
function pause() {
  if (pauseGame(game)) {
    audio.suspend();
    resetInput();
    syncPhase();
  }
}
function resume() {
  initAudio();
  resetInput();
  resumeGame(game);
  syncPhase();
  last = 0;
  accumulator = 0;
}
function closePreview() {
  if (!closeEncounterPreview(game)) return;
  initAudio(); resetInput(); last = 0; accumulator = 0;
  lastPhase = null; syncPhase();
}
function choose(key) {
  initAudio();
  if (game.phase === 'relic') {
    if (chooseRelic(game, key)) { resetInput(); notice(`${RELICS[key].name} 획득`); lastPhase = null; syncPhase(); }
    return;
  }
  if (chooseUpgrade(game, key)) {
    if (EVOLUTIONS[key]) renderer?.celebrateEvolution(key, game.time);
    resetInput();
    notice(EVOLUTIONS[key] ? `${UPGRADE_META[key].name} 진화 · 새로운 공격이 깨어났습니다` : `${['sword', 'ember', 'orbit'].includes(key) ? weaponName(game, key) : UPGRADE_META[key].name} · ${game.ranks[key]}단계`);
    lastPhase = null;
    syncPhase();
  }
}
function panel(html, compact = false) {
  $('panel').className = `panel phase-${game.phase}${compact ? ' is-compact' : ''}`;
  $('panel').innerHTML = html;
  // Keep returning to combat reachable while long field notes scroll inside.
  const actions = $('panel').querySelector(':scope > .panel-actions');
  if (actions && ['paused', 'preview', 'event'].includes(game.phase)) {
    $('panel').classList.add('has-folio-body');
    const body = document.createElement('div');
    body.className = 'folio-body';
    body.tabIndex = 0;
    body.setAttribute('aria-label', '여정 안내');
    while ($('panel').firstElementChild !== actions) body.append($('panel').firstElementChild);
    $('panel').prepend(body);
  }
  $('panel').scrollTop = 0;
  requestAnimationFrame(() => {
    ($('panel').querySelector('#start-game, #restart-game') ?? $('panel').querySelector('button:not(:disabled)'))?.focus({
      preventScroll: true
    });
  });
}
function buildGuide() {
  return `<details class="build-guide"><summary>무기 진화 조건 보기</summary>${Object.entries(EVOLUTIONS).map(([key, recipe]) => `<div><strong>${UPGRADE_META[key].name}</strong><span>${game.ranks[key] ? '진화 완료' : recipe.requirement}</span></div>`).join('')}</details>`;
}
function syncPhase() {
  if (game.phase === 'ended' && ['defeat', 'victory'].includes(game.outcome)) {
    game.endAt ??= performance.now();
    game.endAge = (performance.now() - game.endAt) / 1000;
    game.player.deathAge = game.endAge;
    if (game.endAge < (game.outcome === 'victory' ? .7 : .6)) {
      $('overlay').hidden = true;
      $('hud').inert = true;
      resetInput();
      return;
    }
  }
  if (lastPhase === game.phase) return;
  lastPhase = game.phase;
  $('overlay').dataset.screen = game.phase === 'ready' ? campView : game.phase;
  resetInput();
  accumulator = 0;
  const inPlay = game.phase === 'playing';
  $('overlay').hidden = inPlay;
  $('hud').hidden = game.phase === 'ready';
  $('hud').inert = !inPlay;
  if (inPlay) {
    document.activeElement?.blur();
    updateHud();
    return;
  }
  if (game.phase === 'ready') {
    panel(campView === 'codex' ? codexScreen(profile, codexFilter, codexSelection) : campScreen(game, profile, storageWarning, campSection));
    $('panel').classList.toggle('is-codex', campView === 'codex');
    $('panel').classList.toggle('is-camp', campView === 'prepare');
    for (const button of $('panel').querySelectorAll('[data-camp-section]')) button.onclick = () => changeCampSection(button.dataset.campSection);
    $('panel').querySelectorAll('[data-inheritance]').forEach(button => button.onclick = () => selectInheritance(button.dataset.inheritance));
    $('panel').querySelector('[data-prepare-inheritance]')?.addEventListener('click', event => selectInheritance(event.currentTarget.dataset.prepareInheritance, event.currentTarget.dataset.heir));
    $('start-game')?.addEventListener('click', start);
    $('panel').querySelector('[data-open-codex]')?.addEventListener('click', openCodex);
    $('panel').querySelector('[data-close-codex]')?.addEventListener('click', closeCodex);
    for (const button of $('panel').querySelectorAll('[data-codex-filter]')) button.onclick = () => updateCodex(button.dataset.codexFilter);
    for (const button of $('panel').querySelectorAll('[data-codex-entry]')) button.onclick = () => updateCodex(null, button.dataset.codexEntry);
    $('panel').querySelector('[data-codex-list]')?.addEventListener('click', () => {
      const entry = $('panel').querySelector('[data-codex-entry][aria-pressed="true"]');
      entry?.scrollIntoView({block: 'center'}); entry?.focus({preventScroll: true});
    });
    for (const button of document.querySelectorAll('[data-keepsake]')) button.onclick = () => selectKeepsake(button.dataset.keepsake);
    for (const button of $('panel').querySelectorAll('[data-vow]')) button.onclick = () => selectVow(button.dataset.vow);
    $('panel').querySelector('[data-codex-goal]')?.addEventListener('click', event => selectGoal(event.currentTarget.dataset.codexGoal));
    $('panel').querySelector('[data-clear-goal]')?.addEventListener('click', () => selectGoal(null));
    for (const button of document.querySelectorAll('[data-character]')) button.onclick = () => selectCharacter(button.dataset.character);
    $('panel').querySelector('[data-clear-experiment]')?.addEventListener('click', clearExperiment);
  } else if (game.phase === 'upgrade') {
    const lowHealth = game.player.hp <= game.player.maxHp * .4;
    const recoveryOffered = game.choices.some(key => key === 'heal' || key === 'vitality');
    const choosingBranch = game.choices.some(key => SPECIALIZATIONS[key]);
    panel(`<div class="upgrade-top"><div><p class="eyebrow">성장의 갈림길</p><h1 id="panel-title">다음 힘을 선택하세요</h1><p class="panel-lead">전투가 잠시 멈췄습니다. 하나를 골라 이어가세요.</p><p class="upgrade-health${lowHealth ? ' is-low' : ''}"><span>현재 체력</span><strong>${Math.ceil(game.player.hp)} / ${game.player.maxHp}</strong>${lowHealth ? `<small>${recoveryOffered ? '회복 선택 가능' : '체력 낮음'}</small>` : ''}</p></div><div class="level-medal"><small>LEVEL</small><b>${game.level}</b></div></div>${choosingBranch ? '<p class="upgrade-commitment">전문화는 무기마다 이번 판에 한 갈래만 선택합니다. 진화 후에도 유지됩니다.</p>' : ''}<div class="upgrade-grid">${game.choices.map((key, i) => {
      const weapon = weaponPresentation(game, key);
      const m = ['sword', 'ember', 'orbit'].includes(key) ? {
        ...UPGRADE_META[key],
        name: weapon.name,
        color: weapon.color,
        description: weapon.description
      } : UPGRADE_META[key];
      return `<button class="upgrade-card${(key === game.experiment || goalRelevant(game, key)) ? ' is-experiment' : ''}${lowHealth && ['heal', 'vitality'].includes(key) ? ' is-recovery' : ''}" data-upgrade="${key}" data-weapon-art="${weapon?.art ?? key}" style="--tone:${m.color}">${(key === game.experiment || goalRelevant(game, key)) ? '<span class="experiment-badge">이번 판의 목표</span>' : ''}<small>${game.ranks[key] === 0 && ['sword', 'ember', 'orbit'].includes(key) ? '새로운 무기' : m.kind} · ${game.ranks[key] + 1}단계</small><span class="upgrade-icon">${collectionArt(weapon?.art ?? key) || icon(m.icon)}</span><strong>${m.name}</strong>${weapon?.branch ? `<span class="upgrade-path">${weapon.branchName} 유지</span>` : ''}<p>${key === 'comet' && game.ranks.wildfire ? '연소 전문화를 유지하며 불의 지속 피해를 강화합니다.' : m.description}</p><span class="upgrade-change">${upgradeChange(game, key)}</span><span class="pick-label">이 힘 선택 <kbd>${i + 1}</kbd></span></button>`;
    }).join('')}</div><div class="reroll-row"><button class="secondary" data-reroll ${canReroll(game) ? '' : 'disabled'}>성장 다시 뽑기 · ${game.rerolls}회 남음</button><p role="status">${game.rerollsUsed ? '후보가 바뀌었습니다. ' : ''}진화 후보는 유지 · 선택 전 ${game.rerolls === 0 ? '이번 판의 기회를 모두 사용했어요' : '다른 힘을 찾아보세요'}</p></div>`);
    $('panel').querySelector('[data-reroll]').onclick = () => {
      if (!rerollUpgrades(game)) return;
      lastPhase = null; syncPhase();
      requestAnimationFrame(() => $('panel').querySelector('[data-reroll]')?.focus({preventScroll: true}));
    };
    for (const button of document.querySelectorAll('[data-upgrade]')) button.onclick = () => choose(button.dataset.upgrade);
  } else if (game.phase === 'relic') {
    panel(`<p class="eyebrow">숲이 남긴 선물</p><h1 id="panel-title">숲의 유물을 선택하세요</h1><p class="panel-lead">${ENCOUNTERS[game.rewardFrom].name} 완료 · 이번 판 내내 함께할 힘 하나를 고르세요.</p><div class="upgrade-grid">${game.relicChoices.map((key, i) => { const m = RELICS[key]; return `<button class="upgrade-card relic-card${goalRelevant(game, key) ? ' is-experiment' : ''}" data-relic="${key}" style="--tone:${m.color}">${goalRelevant(game, key) ? '<span class="experiment-badge">이번 판의 목표</span>' : ''}<small>숲의 유물 · 이번 판 유지</small><span class="upgrade-icon">${collectionArt(key) || icon(m.icon)}</span><strong>${m.name}</strong><p>${m.description}</p><span class="upgrade-change">${m.change}</span>${relicContextMarkup(game, key)}<span class="pick-label">이 유물 선택 <kbd>${i+1}</kbd></span></button>`; }).join('')}</div>`);
    for (const button of document.querySelectorAll('[data-relic]')) button.onclick = () => choose(button.dataset.relic);
  } else if (game.phase === 'preview') {
    const event = game.encounters.find(event => event.kind === game.previewEncounter);
    panel(`<p class="eyebrow">선택할 수 있는 보상</p><h1 id="panel-title">${ENCOUNTERS[event.kind].name}의 보상</h1><p class="panel-lead">${event.kind === 'altar' ? '원 안에서 총 10초 버티면 보상을 얻습니다. 범위 밖에서는 진행이 멈춥니다.' : '상자에 접근해 저주를 수락하면 18초간 일반 적의 이동 속도와 접촉 피해가 25% 증가합니다.'}</p>${encounterRewardPreview(game, event)}<div class="panel-actions"><button id="close-preview" class="primary">전장으로 돌아가기</button></div><p class="controls-note">살펴보는 동안 전투와 사건의 시간이 멈춥니다.</p>`);
    $('close-preview').onclick = closePreview;
  } else if (game.phase === 'event') {
    panel(`<p class="eyebrow">저주 상자의 계약</p><h1 id="panel-title">저주를 받아들이겠습니까?</h1><p class="panel-lead">18초 동안 일반 적의 이동 속도와 접촉 피해가 25% 증가합니다.</p><div class="curse-contract"><strong>살아남으면 아래 유물 중 하나 선택</strong><p>지금은 시간이 멈춰 있습니다. 도전을 수락한 뒤부터 저주가 시작됩니다.</p></div>${encounterRewardPreview(game, nearbyChest(game))}<div class="panel-actions"><button id="accept-curse" class="primary">저주를 받아들인다</button><button id="decline-curse" class="secondary">상자를 두고 간다</button></div>`);
    for (const [id, accept] of [['accept-curse',true],['decline-curse',false]]) $(id).onclick = () => { if (chooseCurse(game,accept)) { resetInput(); lastPhase=null; syncPhase(); } };
  } else if (game.phase === 'paused') {
    panel(`<p class="eyebrow">여정의 쉼표</p><h1 id="panel-title">잠시 쉬어가세요</h1><p class="panel-lead">숲도 함께 멈췄습니다.<br>${formatTime(game.time)} 경과 · ${game.kills} 처치 · 레벨 ${game.level}</p>${buildSummary(game)}${buildGuide()}<div class="panel-actions"><button id="resume-game" class="primary">전투 계속하기</button></div><p class="controls-note">시간과 적의 움직임이 모두 정지되어 있습니다.</p>`, true);
    $('resume-game').onclick = resume;
  } else if (game.phase === 'ended') {
    const win = game.outcome === 'victory',
      survived = game.outcome === 'survived',
      record = game.kills > profile.bestKills;
    const saved = recordRun(profile, game);
    profile = saved.profile;
    if (saved.added) {
      game.resultRewards = { discoveries: saved.discoveries, unlocked: saved.unlocked, challenges: saved.challenges, mastery: saved.mastery };
      persist();
    }
    const rewards = game.resultRewards ?? saved;
    panel(`<div class="result-body" tabindex="0" aria-label="이번 여정의 결과"><div class="result-portrait" aria-hidden="true">${portrait(game.characterId, true)}</div><div class="result-mark">${icon(win ? 'star' : 'heart')}</div><p class="eyebrow">${win ? '숲이 기억할 이름' : '다음 장을 향해'}</p><h1 id="panel-title">${win ? '재의 군주를 쓰러뜨렸습니다' : survived ? '살아 돌아왔습니다' : '잠시 쓰러졌을 뿐'}</h1><p class="panel-lead">${win ? '당신의 선택으로 자라난 힘이 숲의 왕관을 깨뜨렸습니다.' : survived ? '5분을 버텼지만 재의 군주는 남아 있습니다. 다음 도전에서 마무리해 보세요.' : '모은 경험과 선택은 다음 도전의 실마리가 됩니다.'}</p><div class="result-stats"><div><small>생존 시간</small><strong>${formatTime(game.time)}</strong></div><div><small>쓰러뜨린 적</small><strong>${game.kills}</strong></div><div><small>도달 레벨</small><strong>${game.level}</strong></div></div><div class="result-build">${['sword', 'ember', 'orbit'].filter(k => game.ranks[k] > 0).map(k => `<span>${weaponName(game, k)} ${game.ranks[k]}단계</span>`).join('')}</div><p class="result-best">${record ? '새로운 처치 기록! · ' : ''}최고 기록 ${profile.bestKills} 처치</p>${resultDetails(game, profile, rewards.unlocked, storageWarning, rewards.challenges, rewards.discoveries, rewards.mastery)}</div><div class="panel-actions"><button id="restart-game" class="primary">다시 숲으로 <span aria-hidden="true">→</span></button><button id="camp-game" class="secondary">동료 선택</button></div>`, true);
    $('panel').classList.add('is-result');
    $('restart-game').onclick = restart;
    $('panel').querySelector('[data-review-discoveries]')?.addEventListener('click', event => {
      const id = event.currentTarget.dataset.reviewDiscoveries;
      campSection = 'prepare'; codexFilter = id.startsWith('relic:') ? 'relics' : 'weapons'; codexSelection = id;
      camp(); openCodex();
      requestAnimationFrame(() => {
        if (matchMedia('(max-width:680px)').matches) {
          $('panel').querySelector('.codex-detail h2')?.focus({preventScroll: true});
          $('panel').querySelector('.codex-layout').scrollTop = 0;
        } else {
          const entry = $('panel').querySelector(`[data-codex-entry="${id}"]`);
          entry?.scrollIntoView({block: 'nearest'}); entry?.focus({preventScroll: true});
        }
      });
    });
    $('camp-game').onclick = () => { campSection = 'prepare'; camp(); };
    $('panel').querySelector('[data-experiment]')?.addEventListener('click', event => prepareExperiment(event.currentTarget.dataset.experiment));
  }
  updateHud();
}
let beltKey = '';
function updateHud() {
  const heroMark = document.querySelector('.hero-mark');
  if (heroMark.dataset.portrait !== game.characterId) {
    heroMark.dataset.portrait = game.characterId;
    heroMark.setAttribute('aria-hidden', 'true');
    heroMark.innerHTML = portrait(game.characterId);
  }
  const ability = signatureState(game);
  $('signature').dataset.state = ability.state;
  $('signature').style.setProperty('--signature-color', ability.color);
  $('signature-name').textContent = ability.name;
  $('signature-state').textContent = ability.label;
  $('signature-meter').firstElementChild.style.width = `${ability.value * 100}%`;
  $('signature-meter').setAttribute('aria-valuenow', String(Math.round(ability.value * 100)));
  $('signature-meter').setAttribute('aria-valuetext', `${ability.name} · ${ability.label} · ${ability.action}`);
  $('signature').title = ability.description;
  const encounter = trackedEncounter(game);
  $('encounter-hud').hidden = !encounter || game.phase !== 'playing';
  if (encounter) {
    const meta = ENCOUNTERS[encounter.kind], distance = encounterDistance(game, encounter);
    $('encounter-name').textContent = `${encounterDirection(game, encounter)} ${meta.name}`;
    $('encounter-hud').classList.toggle('is-cursed', encounter.kind === 'chest' && encounter.state === 'active');
    $('encounter-copy').textContent = encounter.kind === 'chest' && encounter.state === 'active' ? `저주 ${Math.ceil(meta.duration-encounter.progress)}초 · 일반 적 속도·접촉 피해 +25%` : encounter.kind === 'altar' && encounter.state === 'active' ? `봉인 ${Math.min(10,Math.floor(encounter.progress))}/10초 · ${distance <= meta.radius ? '범위 안에서 버티세요' : '제단으로 돌아가면 계속 진행'}` : encounter.kind === 'altar' ? `${Math.round(distance)} 거리 · 원 안에서 10초 버티면 유물` : `${Math.round(distance)} 거리 · 저주를 견디면 유물`;
  }
  $('open-chest').hidden = !nearbyChest(game);
  $('preview-rewards').hidden = !encounter || !!nearbyChest(game);
  const boss = game.enemies.find(e => e.boss && e.hp > 0);
  $('boss-hud').hidden = !boss;
  document.body.classList.toggle('has-boss', !!boss);
  if (boss) {
    $('boss-name').textContent = boss.enraged ? '재의 군주 · 격노' : '재의 군주';
    $('boss-caption').textContent = bossAttackLabel(boss);
    $('boss-health').firstElementChild.style.width = `${boss.hp / boss.maxHp * 100}%`;
    $('boss-health').setAttribute('aria-valuenow', String(Math.round(boss.hp / boss.maxHp * 100)));
    $('boss-health').setAttribute('aria-valuetext', `${Math.ceil(boss.hp)} / ${boss.maxHp}`);
  }
  const recovery = nearestRecovery(game),
    needsRecovery = game.player.hp / game.player.maxHp < .6;
  $('recovery-hint').hidden = !needsRecovery || game.phase !== 'playing';
  $('recovery-hint').textContent = recovery ? `회복 열매 +${RECOVERY.amount} · ${recovery.direction}으로 이동` : '체력 위험 · 무리의 가장자리로 빠져나오세요';
  const p = game.player;
  const hurt = hurtFeedback(game, matchMedia('(prefers-reduced-motion: reduce)').matches);
  const damage = hurt ? Math.round(hurt.amount * 10) / 10 : 0;
  $('hero-name').textContent = hurt ? `−${damage} · ${hurt.label}` : getCharacter(game.characterId).name;
  $('hero-name').classList.toggle('is-hurt', !!hurt);
  $('hp-text').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
  $('hp-bar').firstElementChild.style.width = `${p.hp / p.maxHp * 100}%`;
  $('hp-loss').style.width = `${(hurt?.trailHp ?? p.hp) / p.maxHp * 100}%`;
  $('hp-bar').classList.toggle('is-low', p.hp / p.maxHp < .3);
  $('hp-bar').setAttribute('aria-valuenow', String(Math.round(p.hp / p.maxHp * 100)));
  $('hp-bar').setAttribute('aria-valuetext', `${Math.ceil(p.hp)} / ${p.maxHp}`);
  $('level-badge').textContent = `LV ${game.level}`;
  $('clock').textContent = formatTime(Math.max(0, RUN_SECONDS - game.time));
  $('kills').textContent = game.kills;
  $('xp-text').textContent = `${game.xp} / ${game.xpNeed}`;
  $('xp-bar').firstElementChild.style.width = `${Math.min(100, game.xp / game.xpNeed * 100)}%`;
  $('xp-bar').setAttribute('aria-valuenow', String(Math.round(Math.min(100, game.xp / game.xpNeed * 100))));
  const pacing = combatPacing(game);
  $('phase-label').textContent = championStatus(game) ?? (['rest', 'evolution', 'surge', 'champion'].includes(pacing.kind) ? `${pacing.label} · ${Math.ceil(pacing.remaining)}초` : pacing.label);
  $('phase-label').dataset.pacing = pacing.kind;
  $('coach').textContent = `공격은 자동 · ${SIGNATURES[game.characterId].action}`;
  $('coach').style.opacity = game.time < 14 ? '1' : '0';
  const evolution = nextEvolution(game),
    path = evolution ? EVOLUTIONS[evolution] : null;
  const trackedGoal = goalProgress(game);
  $('evolution-hint').classList.toggle('is-ready', trackedGoal ? trackedGoal.state === 'complete' : !!evolution && canEvolve(game, evolution));
  $('evolution-hint').textContent = trackedGoal ? `목표 · ${trackedGoal.text}` : !path ? '세 무기 진화 완료 · 마지막 대결을 준비하세요' : canEvolve(game, evolution) ? `${UPGRADE_META[evolution].name} 준비 완료 · 다음 강화에서 선택` : `${UPGRADE_META[evolution].name} 진화 · ${UPGRADE_META[path.weapon].name} ${Math.min(3, game.ranks[path.weapon])}/3 · ${UPGRADE_META[path.support].name} ${Math.min(1, game.ranks[path.support])}/1 · 정예 ${Math.min(1, game.eliteKills)}/1`;
  const loadout = weaponLoadout(game);
  const signature = weaponBeltKey(loadout);
  if (signature !== beltKey) {
    beltKey = signature;
    $('weapons').innerHTML = loadout.map(w => w.rank ? `<div class="weapon-slot${w.branch ? ' is-specialized' : ''}${w.evolution ? ' is-evolved' : ''}" data-weapon="${w.family}" data-weapon-art="${w.art}" style="--tone:${w.color}" aria-label="${w.label}" title="${w.label}">${collectionArt(w.art)}${w.stageLabel ? `<small class="weapon-state" aria-hidden="true">${w.stageLabel}</small>` : ''}<span aria-hidden="true">${w.rank}</span></div>` : `<div class="weapon-slot is-empty" aria-label="빈 무기 슬롯"><span aria-hidden="true">+</span></div>`).join('');
  }
}
function tick(now) {
  if (qaPilot && game.phase === 'upgrade') {
    if (qaPilot.shouldReroll(game)) rerollUpgrades(game);
    choose(qaPilot.choose(game));
  }
  if (qaPilot && game.phase === 'relic') choose(qaPilot.relic(game));
  if (qaPilot && game.phase === 'playing' && nearbyChest(game)) { openChest(game); chooseCurse(game,true); }

  const dt = last ? Math.min(.1, (now - last) / 1000) : 0;
  last = now;
  if (game.phase === 'playing') {
    accumulator += dt;
    const manualInput = {
      x: (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0) + stick.x,
      y: (keys.has('s') || keys.has('arrowdown') ? 1 : 0) - (keys.has('w') || keys.has('arrowup') ? 1 : 0) + stick.y
    };
    while (accumulator >= 1 / 60 && game.phase === 'playing') {
      const input = qaPilot ? qaPilot.move(game) : manualInput;
      updateGame(game, 1 / 60, input);
      accumulator -= 1 / 60;
    }
  }
  if (game.events.length) {
    const events = new Set(game.events);
    if (events.has('event-ready')) notice('숲의 사건 발견 · 방향 안내를 따라가 보세요');else if (events.has('curse')) notice('저주 시작 · 18초 동안 살아남으세요');else if (events.has('recovery-ready')) notice('숲의 열매가 열렸습니다 · 가까이 가면 체력 +25');else if (events.has('boss-arrival')) notice('재의 군주 출현 · 공격 예고를 보고 빈틈을 노리세요');else if (events.has('elite')) notice(`${game.enemies.find(e => e.champion && e.hp > 0)?.name ?? '정예'} 출현 · ${CHAMPIONS.find(c => c.id === game.enemies.find(e => e.champion && e.hp > 0)?.champion)?.tip ?? '처치하면 체력 회복'}`);
    if (events.has('elite-break')) notice('정예 격파 · 체력 +15 · 주변 경험치가 모입니다');
    if (events.has('learn-spore')) notice('버섯의 포자 · 점선 원이 차오르면 밖으로 이동하세요');
    else if (events.has('learn-hound')) notice('사냥개 돌진 · 표시된 길 옆으로 피하세요');
    else if (events.has('learn-giant')) notice('거인의 내려찍기 · 고정된 원 밖으로 이동하세요');
    if (events.has('relic-ready')) events.add('evolve');
    for (const event of selectAudioEvents(events)) tone(event);
    game.events.length = 0;
  }
  syncPhase();
  if (renderer) renderer.render(game, now);
  if (now - lastHud > 100) {
    updateHud();
    lastHud = now;
  }
  if (now > noticeUntil) $('notice').classList.remove('show');
  requestAnimationFrame(tick);
}
document.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (key === 'tab' && !$('overlay').hidden) {
    const buttons = [...$('panel').querySelectorAll('button,summary,a[href],input,[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length > 0);
    if (buttons.length) {
      const first = buttons[0],
        end = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        end.focus();
      } else if (!event.shiftKey && document.activeElement === end) {
        event.preventDefault();
        first.focus();
      }
    }
    return;
  }
  if ((key === 'escape' || key === 'p') && !event.repeat) {
    event.preventDefault();
    if (game.phase === 'ready' && campView === 'codex') { closeCodex(); return; }
    if (game.phase === 'preview') closePreview();else if (game.phase === 'event') { chooseCurse(game,false); lastPhase=null; syncPhase(); } else if (game.phase === 'playing') pause();else if (game.phase === 'paused') resume();
    return;
  }
  if (['upgrade', 'relic'].includes(game.phase) && ['1', '2', '3'].includes(key) && !event.repeat) {
    event.preventDefault();
    choose((game.phase === 'relic' ? game.relicChoices : game.choices)[Number(key) - 1]);
    return;
  }
  if (game.phase === 'playing' && ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
    event.preventDefault();
    keys.add(key);
  }
});
document.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => {
  resetInput();
  pause();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    audio.suspend();
    resetInput();
    pause();
  }
});
$('open-chest').onclick = () => { if (openChest(game)) { resetInput(); lastPhase=null; syncPhase(); } };
$('preview-rewards').onclick = () => { if (inspectEncounter(game)) { audio.suspend(); resetInput(); lastPhase=null; syncPhase(); } };
$('pause').onclick = pause;
$('pause').innerHTML = icon('pause');
$('sound').onclick = () => {
  sound = !sound;
  try {
    localStorage.setItem('ash-sound', sound ? 'on' : 'off');
  } catch {}
  if (sound) initAudio();else audio.suspend();
  updateSound();
};
updateSound();
function moveStick(event) {
  if (event.pointerId !== stick.id) return;
  const r = $('touch').getBoundingClientRect(),
    dx = event.clientX - r.left - r.width / 2,
    dy = event.clientY - r.top - r.height / 2,
    d = Math.hypot(dx, dy),
    limit = 34;
  stick.x = dx / Math.max(d, limit);
  stick.y = dy / Math.max(d, limit);
  $('touch').style.setProperty('--x', `${stick.x * limit}px`);
  $('touch').style.setProperty('--y', `${stick.y * limit}px`);
}
$('touch').addEventListener('pointerdown', event => {
  if (game.phase !== 'playing' || stick.id !== null) return;
  event.preventDefault();
  stick.id = event.pointerId;
  $('touch').setPointerCapture(event.pointerId);
  moveStick(event);
});
$('touch').addEventListener('pointermove', moveStick);
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) $('touch').addEventListener(name, event => {
  if (event.pointerId === stick.id) resetInput();
});
if (import.meta.env.DEV && new URLSearchParams(location.search).has('qa')) {
  window.__ASH_QA__ = {
    async prepareRun(character, route, runSeed = 42, preparation = {}) {
      qaPilot = (await import('./qa-pilot.js')).createPilot(route);
      game = createGame(runSeed, character, preparation.keepsake, null, preparation);
      lastPhase = null;
      syncPhase();
    },
    snapshot: () => ({
      signature: {...game.signature},
      inheritance: game.inheritance,
      spores: structuredClone(game.spores),
      hunts: game.enemies.filter(e=>e.hunt).map(e=>({...e.hunt, enemyX:e.x, enemyY:e.y})),
      enemyLessons: [...game.enemyLessons],
      damageTaken: {...game.damageTaken},
      keepsake: game.keepsake,
      vow: game.vow,
      goal: game.goal,
      goalProgress: goalProgress(game),
      rerolls: game.rerolls,
      rerollsUsed: game.rerollsUsed,
      relics: [...game.relics],
      relicChoices: [...game.relicChoices],
      encounters: structuredClone(game.encounters),
      audio: audio.state(),
      supplies: game.supplies.map(s => ({
        ...s
      })),
      healing: {
        ...game.healing
      },
      remnants: game.remnants.length,
      gems: game.gems.length,
      characterId: game.characterId,
      experiment: game.experiment,
      experimentProgress: experimentProgress(game),
      profile: structuredClone(profile),
      storageWarning,
      outcome: game.outcome,
      phase: game.phase,
      time: game.time,
      pacing: combatPacing(game),
      kills: game.kills,
      eliteKills: game.eliteKills,
      championsDefeated: [...game.championsDefeated],
      boss: game.enemies.filter(e => e.boss).map(e => ({
        hp: e.hp,
        maxHp: e.maxHp,
        entrance: e.entrance,
        pattern: e.pattern ? {
          ...e.pattern
        } : null
      }))[0] ?? null,
      bossDefeated: game.bossDefeated,
      thorns: game.thorns.length,
      slams: game.enemies.filter(e => e.slam).map(e => ({
        ...e.slam
      })),
      crescents: game.shots.filter(s => s.kind === 'crescent').length,
      effects: game.effects.map(e => e.kind),
      eliteFinish: game.eliteFinish ? { ...game.eliteFinish } : null,
      attackPose: attackPose(game, matchMedia('(prefers-reduced-motion: reduce)').matches),
      celebration: renderer?.celebration(game.time) ?? null,
      hurtFeedback: hurtFeedback(game, matchMedia('(prefers-reduced-motion: reduce)').matches),
      impacts: game.enemies.filter(e => e.impact && game.time - e.impact.at < .18).map(e => ({ id: e.id, ...e.impact })),
      level: game.level,
      xp: game.xp,
      choices: [...game.choices],
      ranks: {
        ...game.ranks
      },
      player: {
        ...game.player
      },
      enemies: game.enemies.length,
      shots: game.shots.length,
      damageDealt: {
        ...game.damageDealt
      }
    }),
    scenario(name) {
      resetInput();
      const character = name.startsWith('character-') ? name.slice(10) : name === 'experiment-offer' ? game.characterId : 'ash';
      game = createGame(42, character, 'none', profile.experiment, runPreparation(profile, character));
      game.phase = 'playing';
      game.spawnClock = 999;
      game.player.invincible = 999;
      lastPhase = null;
      if (name === 'experiment-offer') {
        game.level = 4; game.ranks[getCharacter(character).weapon] = 3;
        game.gems.push({x:0,y:0,value:9,age:0}); updateGame(game,1/60);
      } else if (name === 'pacing-surge' || name === 'pacing-rest' || name === 'pacing-boss') {
        game.time = name === 'pacing-surge' ? 54 : name === 'pacing-rest' ? 82 : 239.9;
        game.nextElite = 999;
        game.xpNeed = 99999;
        game.spawnClock = 0;
        if (name === 'pacing-boss') game.evolutionBreatherUntil = 247;
      } else if (name === 'player-hurt' || name === 'player-hurt-lethal') {
        game.ranks.sword = 0; game.player.invincible = 0;
        if (name.endsWith('-lethal')) game.player.hp = 3;
        const e = spawnEnemy(game, 0, false, {x:-20,y:0}); e.speed = 0;
        updateGame(game, 1/60);
        game.enemies = [];
        if (game.phase !== 'ended') game.phase = 'paused';
      } else if (name.startsWith('attack-pose-')) {
        const stage = name.slice(12);
        game.swordClock = 0; game.player.invincible = 0;
        const e = spawnEnemy(game, 0, false, {x:65, y:0});e.speed=0;e.hp=999;
        for (let i=0; i<({windup:8,strike:14,recovery:28}[stage] ?? 8); i++) updateGame(game,1/60);
        game.phase = 'paused';
      } else if (name === 'elite-finish') {
        game.swordClock=0;game.player.invincible=0;game.player.hp=60;game.xpNeed=99999;
        const e=spawnEnemy(game,2,true,{x:65,y:0});e.speed=0;e.hp=1;e.attackClock=999;
      } else if (['impact-sword', 'impact-ember', 'impact-orbit', 'impact-evolved-sword', 'impact-evolved-ember', 'impact-evolved-orbit'].includes(name)) {
        const weapon = name.split('-').at(-1);
        if (name.includes('-evolved-')) game.ranks[{sword:'dawn',ember:'comet',orbit:'lunar'}[weapon]]=1;
        game.ranks.sword = 0; game.ranks[weapon] = 1; game.xpNeed = 99999;
        const e = spawnEnemy(game, 0, false, {x: weapon === 'ember' ? 145 : 65, y: 0});
        e.speed = 0; e.hp = e.maxHp = 999;
      } else if (name === 'recovery-choice' || name === 'recovery-choice-full') {
        game.level=12;game.player.hp=name.endsWith('-full')?100:27;game.ranks.vitality=0;
        game.phase='upgrade';game.choices=['sword','vitality','heal'];
      } else if (name === 'enemy-spores') {
        game.time=20;game.player.invincible=0;game.ranks.sword=0;
        game.spores=[{x:0,y:0,age:0}];
      } else if (name === 'enemy-hound' || name === 'enemy-giant') {
        game.ranks.sword=0;game.player.invincible=0;
        const e=spawnEnemy(game,name==='enemy-hound'?1:2,false,{x:-110,y:0});e.huntClock=e.attackClock=0;e.hp=e.maxHp=999;
      } else if (name === 'enemy-warnings') {
        game.time=100;game.ranks.sword=0;game.nextElite=999;
        game.spores=[{x:0,y:100,age:.35}];
        const h=spawnEnemy(game,1,false,{x:-160,y:0});h.hunt={x:-160,y:0,angle:0,age:.4,hit:false};
        const g=spawnEnemy(game,2,false,{x:120,y:50});g.slam={x:80,y:-40,age:.6,hit:false,radius:GIANT.radius,windup:GIANT.windup};
        game.phase='paused';
      } else if (name.startsWith('feel-')) {
        const branch=name.slice(5); const weapon=['sweep','duelist'].includes(branch)?'sword':['wildfire','detonation'].includes(branch)?'ember':'orbit';
        game.ranks.sword=0; game.ranks[weapon]=3; game.ranks[branch]=1; game.xpNeed=99999;
        for(let i=0;i<18;i++){const a=i*Math.PI*2/18;const e=spawnEnemy(game, i%3, false,{x:Math.cos(a)*100,y:Math.sin(a)*100});e.speed=8;e.hp=e.maxHp=branch==='wildfire'?30:500;}
      } else if (name.startsWith('branch-')) {
        const weapon = name.slice(7); game.level = 4; game.ranks[weapon] = 3;
        game.gems.push({x:0,y:0,value:9,age:0}); updateGame(game,1/60);
      } else if (name.startsWith('strengthen-')) {
        const key = name.slice(11), weapon = SPECIALIZATIONS[key]?.weapon ?? EVOLUTIONS[key]?.weapon;
        if (!weapon) return;
        game.level = 5; game.ranks[weapon] = 3; game.ranks[key] = 1;
        if (EVOLUTIONS[key]) game.ranks[{dawn:'duelist',comet:'wildfire',lunar:'horizon'}[key]] = 1;
        game.phase = 'upgrade'; game.choices = [weapon, 'magnet', 'heal'];
      } else if (name === 'event-altar' || name === 'event-chest') {
        const kind = name.slice(6); game.time = kind === 'altar' ? 45 : 135; game.nextElite = 999;
        game.encounters = [{kind, x:35, y:0, state:'available',progress:0}];
        if (kind === 'chest') game.encounters.unshift({kind:'altar',x:0,y:0,state:'completed',progress:10});
      } else if (name === 'upgrade' || name === 'overflow') {
        game.gems.push({
          x: 0,
          y: 0,
          value: name === 'overflow' ? 30 : 9,
          age: 0
        });
        updateGame(game, 1 / 60);
      } else if (name === 'grown') {
        Object.assign(game.ranks, {
          sword: 5,
          ember: 4,
          orbit: 4
        });
        game.time = 150;
        game.nextElite = 180;
        game.level = 12;
        game.xpNeed = xpForLevel(12);
        game.player.invincible = 0;
        for (let i = 0; i < 45; i++) {
          const a = i * 2.399;
          spawnEnemy(game, i % 3, i === 0, {
            x: Math.cos(a) * (110 + i * 7),
            y: Math.sin(a) * (110 + i * 7)
          });
        }
      } else if (name.startsWith('evolution-specialized-')) {
        const branch = name.slice(22), weapon = SPECIALIZATIONS[branch]?.weapon;
        if (!weapon) return;
        const evolution = Object.keys(EVOLUTIONS).find(key => EVOLUTIONS[key].weapon === weapon);
        game.level = 4; game.ranks[weapon] = 3; game.ranks[branch] = 1;
        game.ranks[EVOLUTIONS[evolution].support] = 1; game.eliteKills = 1;
        game.gems.push({x:0,y:0,value:9,age:0}); updateGame(game,1/60);
      } else if (name === 'evolution') {
        game.ranks.sword = 3;
        game.ranks.orbit = 1;
        game.eliteKills = 1;
        game.gems.push({
          x: 0,
          y: 0,
          value: 9,
          age: 0
        });
        updateGame(game, 1 / 60);
      } else if (name === 'slam') {
        game.player.invincible = 0;
        game.swordClock = 999;
        const enemy = spawnEnemy(game, 2, true, {
          x: 180,
          y: 0
        });
        enemy.attackClock = 0;
        updateGame(game, 1 / 60);
      } else if (name === 'evolved') {
        Object.assign(game.ranks, {
          sword: 3,
          orbit: 1,
          dawn: 1
        });
        game.player.invincible = 0;
        game.time = 80;
        game.nextElite = 120;
        game.xpNeed = 999;
        for (let i = 0; i < 22; i++) {
          const a = i * 2.399;
          spawnEnemy(game, i % 3, i === 0, {
            x: Math.cos(a) * (90 + i * 9),
            y: Math.sin(a) * (90 + i * 9)
          });
        }
      } else if (name === 'evolution-comet' || name === 'evolution-lunar') {
        const key = name.split('-')[1],
          path = EVOLUTIONS[key];
        game.ranks[path.weapon] = 3;
        game.ranks[path.support] = 1;
        game.eliteKills = 1;
        game.gems.push({
          x: 0,
          y: 0,
          value: 9,
          age: 0
        });
        updateGame(game, 1 / 60);
      } else if (name === 'comet' || name === 'lunar') {
        game.ranks[name] = 1;
        game.ranks[EVOLUTIONS[name].weapon] = 3;
        game.swordClock = 999;
        game.time = 80;
        game.nextElite = 120;
        game.xpNeed = 999;
        game.player.invincible = 0;
        game.pulseClock = .2;
        for (let i = 0; i < 18; i++) {
          const a = i * 2.399;
          const enemy = spawnEnemy(game, 2, false, {
            x: Math.cos(a) * (110 + i * 3),
            y: Math.sin(a) * (110 + i * 3)
          });
          enemy.speed = 0;
        }
      } else if (name === 'boss' || name === 'boss-thorns' || name === 'boss-kill') {
        game.time = BOSS.arrival;
        game.ranks.sword = 3;
        game.ranks.ember = 2;
        const boss = spawnBoss(game);
        boss.x = 180;
        boss.y = 0;
        boss.entrance = 0;
        boss.attackClock = 0;
        if (name === 'boss-thorns') boss.attackIndex = 1;
        if (name === 'boss-kill') {
          boss.hp = 1;
          boss.x = 62;
          boss.attackClock = 999;
        } else game.swordClock = 999;
      } else if (name === 'record-unlock' || name === 'record-journey' || name === 'record-experiment') {
        if (name === 'record-journey') { game.encounters = [{kind:'altar',state:'completed',progress:10,x:0,y:0}]; game.ranks.sweep=1; game.ranks.horizon=1; }
        if (name === 'record-experiment') { game.ranks.sweep=1; game.ranks.dawn=1; game.ranks.sword=3; game.relics=['fang']; }
        game.runId = crypto.randomUUID();
        game.time = 65;
        game.kills = 200;
        game.damageDealt.sword = 560;
        game.damageTaken.contact = 100;
        game.phase = 'ended';
        game.outcome = 'defeat';
        game.player.hp = 0;
      } else if (name === 'victory') {
        game.bossDefeated = true;
        game.phase = 'ended';
        game.outcome = 'victory';
      } else if (name === 'survived') {
        game.time = RUN_SECONDS - .001;
        updateGame(game, 1 / 60);
      } else if (name === 'defeat') {
        game.player.hp = 0;
        game.phase = 'ended';
        game.outcome = 'defeat';
      } else if (name.startsWith('character-')) {
        game.xpNeed = 999;
        const enemy = spawnEnemy(game, 2, false, {
          x: 60,
          y: 0
        });
        enemy.hp = enemy.maxHp = 999;
        enemy.speed = 0;
      } else if (name === 'stress' || name === 'stress-expansion') {
        game.time = 240;
        game.nextElite = 999;
        game.xpNeed = 999999;
        for (let i = 0; i < 160; i++) {
          const a = i * 2.399,
            e = spawnEnemy(game, i % 3, false, {
              x: Math.cos(a) * (95 + i * 2),
              y: Math.sin(a) * (95 + i * 2)
            });
          e.hp = e.maxHp = 100000;
        }
        for (let i = 0; i < 240; i++) {
          const a = i * 2.399;
          game.gems.push({
            x: Math.cos(a) * 500,
            y: Math.sin(a) * 500,
            value: 2,
            age: 0
          });
        }
        for (let i = 0; i < 80; i++) {
          const a = i * 2.399;
          game.shots.push({
            x: Math.cos(a) * 400,
            y: Math.sin(a) * 400,
            vx: 0,
            vy: 0,
            targetId: null,
            life: 999,
            damage: 1
          });
        }
        Object.assign(game.ranks, {
          sword: 6,
          ember: 5,
          orbit: 5,
          dawn: 1,
          comet: 1,
          lunar: 1
        });
        if (name === 'stress-expansion') {
          Object.assign(game.ranks,{sweep:1,wildfire:1,horizon:1});game.relics=['coal','bell'];
          for (const enemy of game.enemies) { enemy.burn={until:999,next:game.time+.5,damage:33};enemy.slowUntil=999; }
        }
        const boss = spawnBoss(game);
        boss.hp = boss.maxHp = 100000;
      } else if (name === 'recovery') {
        game.time = 74.99;
        game.nextElite = 999;
        game.player.hp = 40;
        updateGame(game, 1 / 60);
      } else if (name === 'combat') {
        spawnEnemy(game, 0, false, {
          x: 62,
          y: 0
        });
      }
      syncPhase();
      last = 0;
      accumulator = 0;
    }
  };
}
loadArt(import.meta.env.BASE_URL, (loaded, total) => {
  const progress = $('art-progress');
  if (!progress) return;
  progress.max = total;
  progress.value = loaded;
  $('art-progress-label').textContent = `여정 준비 ${loaded} / ${total}`;
}).then(art => {
  renderer = createRenderer($('world'), art);
  syncPhase();
  requestAnimationFrame(tick);
}).catch(error => {
  panel(`<p class="eyebrow">잠시 길이 끊겼습니다</p><h1 id="panel-title">숲을 불러오지 못했습니다</h1><p class="panel-lead">이미지 연결을 확인한 뒤 다시 시도하세요.</p><div class="panel-actions"><button id="retry" class="primary">다시 불러오기</button></div>`, true);
  $('retry').onclick = () => location.reload();
  console.error(error);
});
