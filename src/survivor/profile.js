import { SPECIALIZATIONS, RELICS } from './expansion.js';
import { canEquipKeepsake, completedChallenges, KEEPSAKES } from './journey.js';
import { CHARACTERS, getCharacter, isUnlocked } from './characters.js';
import { validExperiment } from './experiments.js';
import { primaryBranches, masteryProgress, canTakeVow, validGoal, goalFound } from './progression.js';
export const PROFILE_KEY = 'ash-profile-v1';
const evolutions = ['dawn', 'comet', 'lunar'];
const integer = (value, max = 1e9) => Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : 0;
const emptyRecord = () => ({
  branches: [],
  evolved: false,
  vowWins: 0,
  runs: 0,
  wins: 0,
  bestKills: 0,
  bestTime: 0,
  fastestWin: null
});
export function createProfile() {
  return {
    version: 1,
    selected: 'ash',
    vow: 'none',
    goal: null,
    experiment: null,
    keepsake: 'none',
    altarRuns: 0,
    runs: 0,
    totalKills: 0,
    bestKills: 0,
    bestTime: 0,
    wins: 0,
    discoveries: [],
    buildDiscoveries: [],
    relicDiscoveries: [],
    runIds: [],
    history: [],
    characters: Object.fromEntries(Object.keys(CHARACTERS).map(key => [key, emptyRecord()]))
  };
}
export function normalizeProfile(input) {
  const profile = createProfile();
  if (!input || typeof input !== 'object' || input.version !== 1) return profile;
  for (const key of ['runs', 'totalKills', 'bestKills', 'wins', 'altarRuns']) profile[key] = integer(input[key]);
  profile.bestTime = integer(input.bestTime, 300);
  profile.discoveries = evolutions.filter(key => Array.isArray(input.discoveries) && input.discoveries.includes(key));
  profile.buildDiscoveries = Object.keys(SPECIALIZATIONS).filter(key => Array.isArray(input.buildDiscoveries) && input.buildDiscoveries.includes(key));
  profile.relicDiscoveries = Object.keys(RELICS).filter(key => Array.isArray(input.relicDiscoveries) && input.relicDiscoveries.includes(key));
  profile.keepsake = canEquipKeepsake(profile, input.keepsake) ? input.keepsake : 'none';
  profile.runIds = Array.isArray(input.runIds) ? [...new Set(input.runIds.filter(id => typeof id === 'string' && id.length < 100))].slice(-64) : [];
  for (const key of Object.keys(CHARACTERS)) {
    const value = input.characters?.[key];
    if (!value || typeof value !== 'object') continue;
    const row = profile.characters[key];
    for (const field of ['runs', 'wins', 'bestKills']) row[field] = integer(value[field]);
    row.bestTime = integer(value.bestTime, 300);
    row.branches = primaryBranches(key).filter(branch => Array.isArray(value.branches) && value.branches.includes(branch));
    row.evolved = value.evolved === true;
    row.vowWins = Math.min(row.wins, integer(value.vowWins));
    if (Number.isFinite(value.fastestWin) && value.fastestWin > 0) row.fastestWin = Math.min(300, value.fastestWin);
  }
  profile.selected = isUnlocked(profile, input.selected) ? getCharacter(input.selected).id : 'ash';
  profile.experiment = validExperiment(profile.selected, input.experiment);
  profile.vow = canTakeVow(profile, input.vow) ? input.vow : 'none';
  profile.goal = validGoal(input.goal);
  if (goalFound(profile, profile.goal)) profile.goal = null;
  if (profile.goal) profile.experiment = null;
  if (Array.isArray(input.history)) profile.history = input.history.slice(0, 5).filter(row => row && typeof row === 'object' && Object.hasOwn(CHARACTERS, row.character)).map(row => ({
    character: getCharacter(row.character).id,
    vow: row.vow === 'mist' ? 'mist' : 'none',
    outcome: ['victory', 'survived', 'defeat'].includes(row.outcome) ? row.outcome : 'defeat',
    time: integer(row.time, 300),
    kills: integer(row.kills),
    level: Math.max(1, integer(row.level, 100)),
    keepsake: Object.hasOwn(KEEPSAKES, row.keepsake) ? row.keepsake : 'none',
    branches: Object.keys(SPECIALIZATIONS).filter(key => Array.isArray(row.branches) && row.branches.includes(key)),
    relics: Object.keys(RELICS).filter(key => Array.isArray(row.relics) && row.relics.includes(key)),
    evolutions: evolutions.filter(key => Array.isArray(row.evolutions) && row.evolutions.includes(key))
  }));
  // Older saves prove builds only in their recent per-character history.
  for (const past of profile.history) {
    const row = profile.characters[past.character];
    row.branches = [...new Set([...row.branches, ...past.branches.filter(key => primaryBranches(past.character).includes(key))])];
    row.evolved ||= past.evolutions.includes(getCharacter(past.character).evolution);
  }
  return profile;
}
export function loadProfile(storage) {
  try {
    const raw = storage.getItem(PROFILE_KEY);
    if (!raw) {
      const profile = createProfile();
      profile.bestKills = integer(Number(storage.getItem('ash-best')));
      return {
        profile,
        canSave: true,
        warning: null
      };
    }
    const input = JSON.parse(raw);
    if (input?.version !== 1) return {
      profile: createProfile(),
      canSave: false,
      warning: '다른 버전의 기록을 보존합니다. 이번 실행의 기록만 유지됩니다.'
    };
    return {
      profile: normalizeProfile(input),
      canSave: true,
      warning: null
    };
  } catch (error) {
    return {
      profile: createProfile(),
      canSave: error instanceof SyntaxError,
      warning: '기록을 불러오지 못했습니다. 이번 실행은 계속할 수 있습니다.'
    };
  }
}
export function saveProfile(storage, profile) {
  try {
    storage.setItem(PROFILE_KEY, JSON.stringify(normalizeProfile(profile)));
    return true;
  } catch {
    return false;
  }
}
export function recordRun(input, game) {
  const profile = normalizeProfile(input);
  if (game.phase !== 'ended' || !['victory', 'survived', 'defeat'].includes(game.outcome) || typeof game.runId !== 'string' || !game.runId || profile.runIds.includes(game.runId)) return {
    profile,
    added: false,
    unlocked: [],
    challenges: [],
    discoveries: { evolutions: [], branches: [], relics: [] }
  };
  const before = Object.keys(CHARACTERS).filter(id => isUnlocked(profile, id));
  const previousChallenges = completedChallenges(profile).map(c => c.id);
  const previousMastery = masteryProgress(profile, game.characterId).filter(s => s.current >= s.target).map(s => s.id);
  const newDiscoveries = {
    evolutions: evolutions.filter(key => game.ranks[key] > 0 && !profile.discoveries.includes(key)),
    branches: Object.keys(SPECIALIZATIONS).filter(key => game.ranks[key] && !profile.buildDiscoveries.includes(key)),
    relics: Object.keys(RELICS).filter(key => game.relics?.includes(key) && !profile.relicDiscoveries.includes(key))
  };
  const character = getCharacter(game.characterId).id,
    kills = integer(game.kills),
    time = integer(game.time, 300),
    win = game.outcome === 'victory';
  profile.runs++;
  profile.totalKills += kills;
  profile.bestKills = Math.max(profile.bestKills, kills);
  profile.bestTime = Math.max(profile.bestTime, time);
  profile.wins += Number(win);
  if (game.encounters?.some(e => e.kind === 'altar' && e.state === 'completed')) profile.altarRuns++;
  const row = profile.characters[character];
  row.runs++;
  row.wins += Number(win);
  row.vowWins += Number(win && game.vow === 'mist');
  row.branches = [...new Set([...row.branches, ...primaryBranches(character).filter(key => game.ranks[key] > 0)])];
  row.evolved ||= game.ranks[getCharacter(character).evolution] > 0;
  row.bestKills = Math.max(row.bestKills, kills);
  row.bestTime = Math.max(row.bestTime, time);
  if (win) row.fastestWin = row.fastestWin === null ? game.time : Math.min(row.fastestWin, game.time);
  const discovered = evolutions.filter(key => game.ranks[key] > 0);
  profile.discoveries = [...new Set([...profile.discoveries, ...discovered])];
  const branches = Object.keys(SPECIALIZATIONS).filter(key => game.ranks[key]);
  const relics = Object.keys(RELICS).filter(key => game.relics?.includes(key));
  profile.buildDiscoveries = [...new Set([...profile.buildDiscoveries, ...branches])];
  profile.relicDiscoveries = [...new Set([...profile.relicDiscoveries, ...relics])];
  if (goalFound(profile, profile.goal)) profile.goal = null;
  profile.history.unshift({
    keepsake: Object.hasOwn(KEEPSAKES, game.keepsake) ? game.keepsake : 'none',
    vow: game.vow === 'mist' ? 'mist' : 'none',
    branches,
    relics,
    character,
    outcome: game.outcome,
    time,
    kills,
    level: integer(game.level, 100),
    evolutions: discovered
  });
  profile.history = profile.history.slice(0, 5);
  profile.runIds.push(game.runId);
  profile.runIds = profile.runIds.slice(-64);
  return {
    profile,
    added: true,
    mastery: masteryProgress(profile, character).filter(s => s.current >= s.target && !previousMastery.includes(s.id)).map(s => s.id),
    discoveries: newDiscoveries,
    challenges: completedChallenges(profile).filter(c => !previousChallenges.includes(c.id)).map(c => c.id),
    unlocked: Object.keys(CHARACTERS).filter(id => !before.includes(id) && isUnlocked(profile, id))
  };
}
