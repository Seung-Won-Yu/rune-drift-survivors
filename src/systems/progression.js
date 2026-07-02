import { RUN_PHASES, WEAPON_CATALOG as weaponCatalog } from '../config/gameData.js';
import {
  BUILD_FOCUS_META,
  BUILD_SYNERGIES
} from '../config/upgrades.js';
import {
  MAX_ORBIT_BLADES,
  STARTING_WEAPON_FAMILIES
} from '../config/gameTuning.js';
import { createEmptyBuildFocus } from './gameState.js';

export function getRunPhase(game) {
  return RUN_PHASES.find(phase => game.time < phase.until) ?? RUN_PHASES[RUN_PHASES.length - 1];
}

export function getWeaponStage(game) {
  return Math.min(3, Math.max(0, Math.floor((game.level - 1) / 2.2) + Math.floor(game.upgrades.length / 4)));
}

export function getWeaponTier(stats, stage = 0) {
  return Math.min(2.35, 1 + stage * 0.18 + (stats.damage - 1) * 0.26 + stats.pierce * 0.08 + (1 - stats.cooldown) * 0.16);
}

export function getOrbColor(stats, stage = 0) {
  if (stage >= 3) return '#fff1a6';
  if (stage >= 2) return '#c7f9ff';
  if (stage >= 1) return '#7fffd7';
  if (stats.damage > 1.45) return '#ffef9a';
  if (stats.pierce > 1) return '#c7f9ff';
  return weaponCatalog[0].color;
}

export function getStormColor(stats, stage = 0) {
  if (stage >= 3) return '#f5c7ff';
  if (stage >= 2) return '#fff1a6';
  if (stats.cooldown < 0.72) return '#d7b7ff';
  if (stats.damage > 1.35) return '#fff1a6';
  return weaponCatalog[1].color;
}

export function getBladeColor(stats, stage = 0) {
  if (stage >= 3) return '#ffffff';
  if (stage >= 2) return '#ffe58a';
  if (stats.damage > 1.35) return '#ffdf6e';
  return weaponCatalog[2].color;
}

export function getLightningColor(stats, stage = 0) {
  if (stage >= 3) return '#ffffff';
  if (stage >= 2) return '#f5c7ff';
  if (stats.lightningChains >= 5) return '#c7f9ff';
  return weaponCatalog[3].color;
}

export function getNovaColor(stats, stage = 0) {
  if (stage >= 3) return '#fff1a6';
  if (stage >= 2) return '#ffbf7a';
  if (stats.novaRadius > 1.35) return '#ffd27f';
  return weaponCatalog[4].color;
}

export function getBladeCount(stats, bladeFocus = 0, unlocked = true) {
  if (!unlocked) return 0;
  return Math.min(MAX_ORBIT_BLADES, 2 + stats.bladeBonus + Math.floor(stats.pierce / 2) + Math.floor(bladeFocus / 2) + (stats.damage > 1.5 ? 1 : 0));
}

export function getUpgradeFocusKey(upgrade) {
  if (!upgrade) return null;
  if (upgrade.id.startsWith('orb') || upgrade.id === 'pierce') return 'orb';
  if (upgrade.id.startsWith('storm')) return 'storm';
  if (upgrade.id.startsWith('blade')) return 'blade';
  if (upgrade.id.startsWith('chain')) return 'chain';
  if (upgrade.id.startsWith('nova')) return 'nova';
  return null;
}

export function getUpgradeVisualFamilyKey(upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  if (key) return key;
  if (upgrade.id === 'magnet') return 'magnet';
  if (upgrade.id === 'luck') return 'growth';
  if (upgrade.id === 'dash' || upgrade.id === 'speed') return 'mobility';
  if (upgrade.id === 'maxHp') return 'ward';
  if (upgrade.family === '공용') return 'power';
  return 'utility';
}

export function isWeaponFamilyUnlocked(game, key) {
  if (!key) return true;
  if (STARTING_WEAPON_FAMILIES.has(key)) return true;
  if (getBuildFocus(game, key) > 0) return true;
  return game?.upgrades?.some(upgradeId => getUpgradeFocusKey({ id: upgradeId }) === key) ?? false;
}

export function getUnlockedWeaponFamilyCount(game) {
  return Object.keys(BUILD_FOCUS_META).filter(key => isWeaponFamilyUnlocked(game, key)).length;
}

export function applyBuildFocus(buildFocus, key) {
  const next = { ...createEmptyBuildFocus(), ...(buildFocus ?? {}) };
  if (key && next[key] !== undefined) next[key] += 1;
  return next;
}

export function getBuildFocus(game, key) {
  return Math.max(0, game?.buildFocus?.[key] ?? 0);
}

export function getFocusMessage(key, buildFocus) {
  if (!key || !BUILD_FOCUS_META[key]) return '';
  const focus = buildFocus?.[key] ?? 0;
  const meta = BUILD_FOCUS_META[key];
  return `${meta.label} 집중 ${formatFocusLevel(focus)}: ${meta.perks[Math.min(meta.perks.length - 1, focus - 1)]}`;
}

export function getDominantBuild(game) {
  const entries = Object.entries({ ...createEmptyBuildFocus(), ...(game.buildFocus ?? {}) })
    .filter(([, focus]) => focus > 0)
    .sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const [key, focus] = entries[0];
  return { key, focus, ...BUILD_FOCUS_META[key] };
}

function getSynergyLevelFromFocus(game, synergy, focusMap = game?.buildFocus) {
  const focus = { ...createEmptyBuildFocus(), ...(focusMap ?? {}) };
  if (synergy.id === 'orb-pierce') {
    const pierceRanks = getUpgradePickCount(game, 'pierce') + getUpgradePickCount(game, 'orb-lance');
    return Math.min(4, Math.max(0, focus.orb - 1) + pierceRanks);
  }
  return Math.min(4, ...synergy.keys.map(key => focus[key] ?? 0));
}

export function getSynergyLevel(game, synergyId) {
  const synergy = BUILD_SYNERGIES.find(item => item.id === synergyId);
  return synergy ? getSynergyLevelFromFocus(game, synergy) : 0;
}

export function getBuildSynergyStates(game) {
  const focus = { ...createEmptyBuildFocus(), ...(game?.buildFocus ?? {}) };
  return BUILD_SYNERGIES.map(synergy => {
    const level = getSynergyLevelFromFocus(game, synergy, focus);
    const progress = synergy.id === 'orb-pierce'
      ? Math.min(1, (focus.orb + getUpgradePickCount(game, 'pierce') + getUpgradePickCount(game, 'orb-lance')) / 3)
      : Math.min(1, synergy.keys.reduce((sum, key) => sum + Math.min(2, focus[key] ?? 0), 0) / (synergy.keys.length * 2));
    return { ...synergy, level, progress };
  }).sort((a, b) => (b.level - a.level) || (b.progress - a.progress));
}

export function getUpgradeSynergyMatches(game, upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  const nextFocus = applyBuildFocus(game?.buildFocus, key);
  return BUILD_SYNERGIES
    .map(synergy => {
      const currentLevel = getSynergyLevelFromFocus(game, synergy);
      let nextLevel = getSynergyLevelFromFocus(game, synergy, nextFocus);
      if (synergy.id === 'orb-pierce' && (upgrade.id === 'pierce' || upgrade.id === 'orb-lance')) {
        nextLevel = Math.min(4, nextLevel + 1);
      }
      return { ...synergy, currentLevel, nextLevel };
    })
    .filter(synergy => {
      if (synergy.nextLevel > synergy.currentLevel) return true;
      if (synergy.id === 'orb-pierce' && (upgrade.id === 'pierce' || upgrade.id === 'orb-lance')) return true;
      return key && synergy.keys.includes(key) && synergy.currentLevel > 0;
    })
    .sort((a, b) => (b.nextLevel - b.currentLevel) - (a.nextLevel - a.currentLevel));
}

export function getUpgradePickCount(game, id) {
  return game?.upgrades?.filter(upgradeId => upgradeId === id).length ?? 0;
}

export function formatFocusLevel(focus) {
  return ['0', 'I', 'II', 'III', 'IV', 'V', 'VI'][Math.min(6, Math.max(0, focus))];
}
