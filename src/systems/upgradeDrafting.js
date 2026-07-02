import {
  UPGRADE_RANK_LIMITS,
  WEAPON_UPGRADE_IDS,
  upgradePool
} from '../config/upgrades.js';
import {
  ADVANCED_ORB_UNLOCK_LEVEL,
  ADVANCED_ORB_UNLOCK_TIME,
  ADVANCED_ORB_UPGRADE_IDS,
  GLOBAL_POWER_UNLOCK_LEVEL,
  GLOBAL_POWER_UNLOCK_TIME,
  GLOBAL_POWER_UPGRADE_IDS,
  NEW_WEAPON_UNLOCK_CACHE_COUNT,
  NEW_WEAPON_UNLOCK_LEVEL,
  NEW_WEAPON_UNLOCK_SHRINE_COUNT,
  NEW_WEAPON_UNLOCK_TIME,
  UPGRADE_CHOICE_COUNT
} from '../config/gameTuning.js';
import { getItemPickupCount } from './gameState.js';
import {
  getBuildFocus,
  getDominantBuild,
  getRunPhase,
  getUpgradeFocusKey,
  getUpgradePickCount,
  getUpgradeSynergyMatches,
  getUpgradeVisualFamilyKey,
  getWeaponStage,
  isWeaponFamilyUnlocked
} from './progression.js';
import { getUpgradeCardMeta } from './upgradePresentation.js';

const STARTER_UTILITY_UPGRADE_IDS = new Set(['magnet', 'speed', 'dash', 'maxHp', 'luck']);

export function pickArmoryBoost(game, excludedIds = new Set()) {
  const stage = getWeaponStage(game);
  const weighted = [
    upgradePool.find(upgrade => upgrade.id === 'orb-count'),
    upgradePool.find(upgrade => upgrade.id === 'orb-fan'),
    upgradePool.find(upgrade => upgrade.id === 'orb-lance'),
    upgradePool.find(upgrade => upgrade.id === 'chain-plus'),
    upgradePool.find(upgrade => upgrade.id === 'chain-web'),
    upgradePool.find(upgrade => upgrade.id === 'chain-smite'),
    upgradePool.find(upgrade => upgrade.id === 'storm-burst'),
    upgradePool.find(upgrade => upgrade.id === 'storm-volley'),
    upgradePool.find(upgrade => upgrade.id === 'storm-carpet'),
    upgradePool.find(upgrade => upgrade.id === 'blade-plus'),
    upgradePool.find(upgrade => upgrade.id === 'blade-guard'),
    upgradePool.find(upgrade => upgrade.id === 'blade-reaper'),
    upgradePool.find(upgrade => upgrade.id === 'nova-plus'),
    upgradePool.find(upgrade => upgrade.id === 'nova-pulse'),
    upgradePool.find(upgrade => upgrade.id === 'nova-comet'),
    stage >= 2 && canDraftGlobalPower(game) ? upgradePool.find(upgrade => upgrade.id === 'damage') : null,
    stage >= 2 && canDraftGlobalPower(game) ? upgradePool.find(upgrade => upgrade.id === 'cooldown') : null,
    game.stats.pierce < 3 ? upgradePool.find(upgrade => upgrade.id === 'pierce') : null
  ].filter(Boolean);

  const available = weighted.filter(upgrade => isUpgradeAvailable(game, upgrade) && isUpgradeDraftable(game, upgrade) && !excludedIds.has(upgrade.id));
  return pickWeightedUpgrade(available, game)
    ?? upgradePool.find(upgrade => isUpgradeAvailable(game, upgrade) && isUpgradeDraftable(game, upgrade) && !excludedIds.has(upgrade.id));
}

function isUpgradeAvailable(game, upgrade) {
  if (!game) return true;
  const stats = game.stats;
  const rankLimit = UPGRADE_RANK_LIMITS[upgrade.id];
  if (rankLimit && getUpgradePickCount(game, upgrade.id) >= rankLimit) return false;
  if (upgrade.id === 'orb-count') return stats.orbCount < 7;
  if (upgrade.id === 'orb-fan') return stats.orbCount < 8;
  if (upgrade.id === 'blade-plus') return stats.bladeBonus < 5;
  if (upgrade.id === 'blade-guard') return stats.bladeBonus < 6;
  if (upgrade.id === 'chain-plus') return stats.lightningChains < 9;
  if (upgrade.id === 'chain-web') return stats.lightningChains < 11;
  if (upgrade.id === 'storm-volley') return stats.stormStrikes < 4;
  return true;
}

function isUpgradeDraftable(game, upgrade) {
  if (!game || !upgrade) return true;
  if (ADVANCED_ORB_UPGRADE_IDS.has(upgrade.id) && !canDraftAdvancedOrb(game)) return false;
  if (GLOBAL_POWER_UPGRADE_IDS.has(upgrade.id) && !canDraftGlobalPower(game)) return false;
  const key = getUpgradeFocusKey(upgrade);
  if (!key) return true;
  if (isWeaponFamilyUnlocked(game, key)) return true;
  if (key === 'orb') return true;
  return canDraftNewWeaponFamily(game);
}

function canDraftAdvancedOrb(game) {
  return game.level >= ADVANCED_ORB_UNLOCK_LEVEL
    || game.time >= ADVANCED_ORB_UNLOCK_TIME
    || getUpgradePickCount(game, 'orb-count') > 0
    || getUpgradePickCount(game, 'pierce') > 0;
}

function canDraftGlobalPower(game) {
  return game.level >= GLOBAL_POWER_UNLOCK_LEVEL
    || game.time >= GLOBAL_POWER_UNLOCK_TIME
    || game.upgrades.length >= 7;
}

function hasIntentionalArmoryUnlock(game) {
  return getItemPickupCount(game, 'cache') >= NEW_WEAPON_UNLOCK_CACHE_COUNT
    || (game.shrineActivations ?? 0) >= NEW_WEAPON_UNLOCK_SHRINE_COUNT;
}

function canDraftNewWeaponFamily(game) {
  return game.level >= NEW_WEAPON_UNLOCK_LEVEL
    || game.time >= NEW_WEAPON_UNLOCK_TIME
    || hasIntentionalArmoryUnlock(game);
}

function getUpgradeWeight(game, upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  const runPhase = getRunPhase(game);
  const dominant = getDominantBuild(game);
  const pickCount = getUpgradePickCount(game, upgrade.id);
  let weight = WEAPON_UPGRADE_IDS.has(upgrade.id) ? 1.15 : 0.78;

  if (key) {
    const focus = getBuildFocus(game, key);
    const synergyDelta = getUpgradeSynergyMatches(game, upgrade).some(synergy => synergy.nextLevel > synergy.currentLevel);
    const intentionalArmoryUnlock = hasIntentionalArmoryUnlock(game);
    weight += focus * 0.48;
    if (!isWeaponFamilyUnlocked(game, key)) {
      weight += intentionalArmoryUnlock ? 0.86 : game.level >= NEW_WEAPON_UNLOCK_LEVEL ? 0.62 : 0.34;
    }
    if (synergyDelta) weight += 1.7;
    if (dominant?.key === key) weight += 1.15;
    if (focus === 0 && game.level <= 8) weight += key === 'orb' ? 0.96 : 0.28;
    if (game.level <= 5 && key === 'orb') weight += 0.42;
    if (runPhase.id === 'anchor' && key === 'orb') weight += 0.35;
    if (runPhase.id === 'armory' && !isWeaponFamilyUnlocked(game, key)) weight += intentionalArmoryUnlock ? 0.62 : 0.38;
    if (runPhase.id === 'synergy' && synergyDelta) weight += 0.72;
    if (runPhase.id === 'final' && dominant?.key === key) weight += 0.35;
  } else {
    if (upgrade.id === 'maxHp' && game.stats.hp / game.stats.maxHp < 0.72) weight += 1.25;
    if (upgrade.id === 'magnet' && game.level <= 4) weight += 0.55;
    if (STARTER_UTILITY_UPGRADE_IDS.has(upgrade.id) && game.level <= 5) weight += 0.32;
    if (upgrade.id === 'speed' && game.time > 75) weight += 0.35;
    if (upgrade.id === 'cooldown' || upgrade.id === 'damage') weight += Math.min(1.0, game.upgrades.length * 0.08);
    if (runPhase.id === 'anchor' && (upgrade.id === 'magnet' || upgrade.id === 'speed' || upgrade.id === 'maxHp')) weight += 0.34;
    if (runPhase.id === 'final' && (upgrade.id === 'maxHp' || upgrade.id === 'dash' || upgrade.id === 'cooldown' || upgrade.id === 'damage')) weight += 0.5;
  }

  return Math.max(0.08, weight * Math.max(0.26, 1 - pickCount * 0.2));
}

function pickWeightedUpgrade(pool, game) {
  if (pool.length === 0) return null;
  const total = pool.reduce((sum, upgrade) => sum + getUpgradeWeight(game, upgrade), 0);
  let roll = Math.random() * total;
  for (const upgrade of pool) {
    roll -= getUpgradeWeight(game, upgrade);
    if (roll <= 0) return upgrade;
  }
  return pool[pool.length - 1];
}

function addDraftChoice(choices, candidates, game) {
  if (choices.length >= UPGRADE_CHOICE_COUNT) return;
  const available = candidates.filter(upgrade => !choices.some(choice => choice.id === upgrade.id));
  const choice = pickWeightedUpgrade(available, game);
  if (choice) choices.push(choice);
}

function getUpgradeChoiceGroup(upgrade) {
  return getUpgradeVisualFamilyKey(upgrade);
}

function pickDiverseUpgradeReplacement(game, draftable, currentChoices, usedGroups) {
  const usedIds = new Set(currentChoices.map(choice => choice.id));
  const diversePool = draftable.filter(upgrade => (
    !usedIds.has(upgrade.id)
    && !usedGroups.has(getUpgradeChoiceGroup(upgrade))
  ));
  return pickWeightedUpgrade(diversePool, game);
}

function diversifyUpgradeChoices(game, choices, draftable) {
  const result = [];
  const usedGroups = new Set();

  choices.forEach(choice => {
    if (result.length >= UPGRADE_CHOICE_COUNT) return;
    const group = getUpgradeChoiceGroup(choice);
    if (!result.some(picked => picked.id === choice.id) && !usedGroups.has(group)) {
      result.push(choice);
      usedGroups.add(group);
      return;
    }

    const replacement = pickDiverseUpgradeReplacement(game, draftable, result, usedGroups);
    const nextChoice = replacement ?? choice;
    result.push(nextChoice);
    usedGroups.add(getUpgradeChoiceGroup(nextChoice));
  });

  while (result.length < UPGRADE_CHOICE_COUNT && result.length < draftable.length) {
    const replacement = pickDiverseUpgradeReplacement(game, draftable, result, usedGroups);
    if (!replacement) break;
    result.push(replacement);
    usedGroups.add(getUpgradeChoiceGroup(replacement));
  }

  return result;
}

function getUpgradeChoicePriority(game, upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  const dominant = getDominantBuild(game);
  const cardMeta = getUpgradeCardMeta(game, upgrade);
  const improvesSynergy = getUpgradeSynergyMatches(game, upgrade).some(synergy => synergy.nextLevel > synergy.currentLevel);
  let priority = cardMeta.recommended ? 100 : 0;

  if (cardMeta.reason === '새 무기') priority += 24;
  if (improvesSynergy) priority += 20;
  if (key && dominant?.key === key) priority += 12;
  if (upgrade.id === 'maxHp' && game.stats.hp / game.stats.maxHp < 0.72) priority += 16;
  if (upgrade.id === 'magnet' && game.level <= 4) priority += 14;
  if (upgrade.id === 'damage' || upgrade.id === 'cooldown') priority += Math.min(14, game.upgrades.length * 2);

  return priority;
}

function orderUpgradeChoices(game, choices) {
  return choices
    .map(choice => ({
      choice,
      priority: getUpgradeChoicePriority(game, choice),
      roll: Math.random()
    }))
    .sort((a, b) => b.priority - a.priority || a.roll - b.roll)
    .map(entry => entry.choice);
}

export function pickUpgrades(game) {
  const available = upgradePool.filter(upgrade => isUpgradeAvailable(game, upgrade));
  const draftable = available.filter(upgrade => isUpgradeDraftable(game, upgrade));
  const weaponChoices = draftable.filter(upgrade => WEAPON_UPGRADE_IDS.has(upgrade.id));
  const utilityChoices = draftable.filter(upgrade => !WEAPON_UPGRADE_IDS.has(upgrade.id));
  const starterChoices = weaponChoices.filter(upgrade => getUpgradeFocusKey(upgrade) === 'orb');
  const starterUtilityChoices = utilityChoices.filter(upgrade => STARTER_UTILITY_UPGRADE_IDS.has(upgrade.id));
  const newWeaponUnlocked = canDraftNewWeaponFamily(game);
  const intentionalArmoryUnlock = hasIntentionalArmoryUnlock(game);
  const lockedWeaponChoices = weaponChoices.filter(upgrade => {
    const key = getUpgradeFocusKey(upgrade);
    return key && !isWeaponFamilyUnlocked(game, key);
  });
  const dominant = getDominantBuild(game);
  const choices = [];

  if (game.level <= 3) {
    addDraftChoice(choices, starterChoices, game);
    addDraftChoice(choices, starterUtilityChoices, game);
  } else if (game.level <= 5) {
    addDraftChoice(choices, starterChoices, game);
    addDraftChoice(choices, starterUtilityChoices, game);
    addDraftChoice(choices, utilityChoices, game);
  } else if (game.level <= 7) {
    addDraftChoice(choices, starterChoices, game);
    if (newWeaponUnlocked && intentionalArmoryUnlock) addDraftChoice(choices, lockedWeaponChoices, game);
    addDraftChoice(choices, starterUtilityChoices, game);
  }
  if (dominant?.focus >= 2) {
    addDraftChoice(choices, weaponChoices.filter(upgrade => getUpgradeFocusKey(upgrade) === dominant.key), game);
  }
  addDraftChoice(choices, weaponChoices.filter(upgrade => getUpgradeSynergyMatches(game, upgrade).some(synergy => synergy.nextLevel > synergy.currentLevel)), game);
  if (newWeaponUnlocked && game.level >= 6 && game.level <= 9) {
    for (let index = 0; index < 2; index += 1) {
      addDraftChoice(choices, weaponChoices.filter(upgrade => {
        const key = getUpgradeFocusKey(upgrade);
        return key && getBuildFocus(game, key) === 0 && !choices.some(choice => getUpgradeFocusKey(choice) === key);
      }), game);
    }
  }
  addDraftChoice(choices, weaponChoices, game);
  addDraftChoice(choices, utilityChoices, game);
  while (choices.length < UPGRADE_CHOICE_COUNT && choices.length < draftable.length) {
    addDraftChoice(choices, draftable, game);
  }

  return orderUpgradeChoices(game, diversifyUpgradeChoices(game, choices, draftable));
}
