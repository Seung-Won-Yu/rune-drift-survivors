import { RUN_PHASES, WEAPON_CATALOG as weaponCatalog } from '../config/gameData.js';
import {
  BUILD_FOCUS_META,
  BUILD_SYNERGIES,
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
  MAX_ORBIT_BLADES,
  NEW_WEAPON_UNLOCK_CACHE_COUNT,
  NEW_WEAPON_UNLOCK_LEVEL,
  NEW_WEAPON_UNLOCK_SHRINE_COUNT,
  NEW_WEAPON_UNLOCK_TIME,
  STARTING_WEAPON_FAMILIES,
  UPGRADE_CHOICE_COUNT
} from '../config/gameTuning.js';
import { createEmptyBuildFocus, getItemPickupCount } from './gameState.js';

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

export function hasUpgrade(game, id) {
  return game.upgrades.includes(id);
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

function getUpgradeSynergyMatches(game, upgrade) {
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

export function getUpgradeTone(upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  return key ? BUILD_FOCUS_META[key].color : '#fff1a6';
}

export function getUpgradeIconMeta(upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  if (key && BUILD_FOCUS_META[key]) return BUILD_FOCUS_META[key];
  if (upgrade.id === 'maxHp') return { glyph: '+', color: '#79f29a' };
  if (upgrade.id === 'dash' || upgrade.id === 'speed') return { glyph: '›', color: '#73fbd3' };
  if (upgrade.id === 'magnet' || upgrade.id === 'luck') return { glyph: '✦', color: '#fff1a6' };
  return { glyph: '✚', color: '#fff1a6' };
}

export function getUpgradeFocusPreview(game, upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  const synergy = getUpgradeSynergyMatches(game, upgrade)[0];
  const unlocksWeapon = key && !isWeaponFamilyUnlocked(game, key);
  if (synergy && synergy.nextLevel > synergy.currentLevel) {
    return `${synergy.title} ${formatFocusLevel(synergy.nextLevel)} - ${synergy.bonus}`;
  }
  if (!key) return '공용 강화';
  const focus = getBuildFocus(game, key) + 1;
  const meta = BUILD_FOCUS_META[key];
  if (unlocksWeapon) return `신규 무기 해금 - ${meta.label} ${meta.perks[0]}`;
  return `${meta.title} ${formatFocusLevel(focus)} - ${meta.perks[Math.min(meta.perks.length - 1, focus - 1)]}`;
}

function getUpgradeImpactLabel(upgrade) {
  if (upgrade.id.includes('count') || upgrade.id.includes('fan') || upgrade.id.includes('volley') || upgrade.id.includes('plus') || upgrade.id.includes('web')) {
    return '타수 증가';
  }
  if (upgrade.id.includes('burst') || upgrade.id.includes('carpet') || upgrade.id.includes('nova') || upgrade.id.includes('reaper')) {
    return '범위 압박';
  }
  if (upgrade.id.includes('lance') || upgrade.id === 'pierce') return '관통 강화';
  if (upgrade.id.includes('guard') || upgrade.id === 'maxHp') return '생존 보강';
  if (upgrade.id.includes('smite') || upgrade.id === 'damage') return '피해 상승';
  if (upgrade.id === 'cooldown' || upgrade.id === 'dash' || upgrade.id === 'speed') return '속도 상승';
  if (upgrade.id === 'magnet' || upgrade.id === 'luck') return '성장 가속';
  return upgrade.branch;
}

function getUpgradeDecisionCopy(game, upgrade, context) {
  const { key, dominant, focus, primarySynergy, improvesSynergy, unlocksWeapon, pickCount } = context;
  if (unlocksWeapon && key) {
    return { decision: '새 공격 루트', payoff: `${BUILD_FOCUS_META[key].label} 해금` };
  }
  if (improvesSynergy && primarySynergy) {
    return { decision: '공명 단계 상승', payoff: primarySynergy.bonus };
  }
  if (upgrade.id === 'maxHp' && game.stats.hp / game.stats.maxHp < 0.72) {
    return { decision: '위험 완화', payoff: '체력 안정' };
  }
  if (upgrade.id === 'magnet' && game.level <= 4) {
    return { decision: '초반 성장', payoff: 'XP 회수 쉬움' };
  }
  if (upgrade.id === 'damage' || upgrade.id === 'cooldown') {
    return { decision: '전체 효율', payoff: '모든 무기 강화' };
  }
  if (key && dominant?.key === key && dominant.focus >= 2) {
    return { decision: '주력 빌드', payoff: `${BUILD_FOCUS_META[key].label} 집중` };
  }
  if (key && focus === 0) {
    return { decision: '새 빌드 후보', payoff: `${BUILD_FOCUS_META[key].label} 시작` };
  }
  if (pickCount > 0) {
    return { decision: '중첩 강화', payoff: `랭크 ${formatFocusLevel(pickCount + 1)}` };
  }
  if (upgrade.id === 'dash' || upgrade.id === 'speed') return { decision: '회피 안정', payoff: '기동력 증가' };
  if (upgrade.id === 'luck') return { decision: '성장 투자', payoff: '보상 기대값 증가' };
  if (key) return { decision: '집중도 상승', payoff: `${BUILD_FOCUS_META[key].label} 강화` };
  return { decision: upgrade.branch, payoff: getUpgradeImpactLabel(upgrade) };
}

function getUpgradeStatLine(upgrade) {
  const statLines = {
    'orb-count': '룬 구체 +1발',
    'orb-fan': '구체 +2 / 피해 -6%',
    'orb-lance': '피해 +32% / 관통 +1',
    'storm-burst': '범위 +18% / 피해 +8%',
    'storm-volley': '낙뢰 +1 / 쿨다운 단축',
    'storm-carpet': '지속 +30% / 범위 +14%',
    'blade-plus': '칼날 +1',
    'blade-guard': '칼날 +2 / 근접 방어',
    'blade-reaper': '피해 +34% / 범위 +18%',
    'chain-plus': '연쇄 +1 / 피해 +8%',
    'chain-web': '연쇄 +3 / 사거리 +18%',
    'chain-smite': '부상 적 추가 피해',
    'nova-plus': '범위 +20% / 피해 +8%',
    'nova-pulse': '쿨다운 -14% / 연타',
    'nova-comet': '피해 +38% / 범위 +12%',
    damage: '모든 피해 +16%',
    speed: '이동 속도 +12%',
    cooldown: '공격 간격 -10%',
    magnet: 'XP 흡수 거리 +35%',
    luck: 'XP 획득량 +18%',
    dash: '대시 쿨다운 -18%',
    maxHp: '최대 체력 +20',
    pierce: '구체 관통 +1'
  };
  return statLines[upgrade.id] ?? upgrade.text;
}

function getUpgradeQuickRead(game, upgrade, context, decisionCopy) {
  const { key, dominant, focus, primarySynergy, improvesSynergy, unlocksWeapon, pickCount } = context;
  const meta = key ? BUILD_FOCUS_META[key] : null;

  if (unlocksWeapon && meta) {
    return { quickLead: '새 무기', quickSummary: `${meta.label}가 전장에 추가됩니다` };
  }
  if (improvesSynergy && primarySynergy) {
    return { quickLead: '공명 상승', quickSummary: `${primarySynergy.title} ${formatFocusLevel(primarySynergy.nextLevel)} 발동` };
  }
  if (upgrade.id === 'maxHp' && game.stats.hp / game.stats.maxHp < 0.72) {
    return { quickLead: '생존 보강', quickSummary: '죽기 전 버틸 시간을 늘립니다' };
  }
  if (upgrade.id === 'magnet' && game.level <= 4) {
    return { quickLead: '성장 가속', quickSummary: '놓친 XP를 더 쉽게 회수합니다' };
  }
  if (upgrade.id === 'damage') {
    return { quickLead: '전체 화력', quickSummary: '모든 공격의 피해가 오릅니다' };
  }
  if (upgrade.id === 'cooldown') {
    return { quickLead: '공격 속도', quickSummary: '무기들이 더 자주 발동됩니다' };
  }
  if (upgrade.id === 'dash' || upgrade.id === 'speed') {
    return { quickLead: '회피 안정', quickSummary: '포위망에서 빠져나오기 쉬워집니다' };
  }
  if (upgrade.id === 'luck') {
    return { quickLead: '보상 투자', quickSummary: '다음 선택지의 기대값을 올립니다' };
  }
  if (meta && dominant?.key === key && dominant.focus >= 2) {
    return { quickLead: '주력 강화', quickSummary: `${meta.label} 빌드의 힘을 밀어줍니다` };
  }
  if (meta && focus === 0) {
    return { quickLead: '빌드 시작', quickSummary: `${meta.label} 방향으로 전환합니다` };
  }
  if (pickCount > 0) {
    return { quickLead: '중첩 강화', quickSummary: `${upgrade.family} ${formatFocusLevel(pickCount + 1)}단계 상승` };
  }
  if (meta) {
    return { quickLead: getUpgradeImpactLabel(upgrade), quickSummary: `${meta.label} 전투 성능을 높입니다` };
  }
  return { quickLead: decisionCopy.decision, quickSummary: decisionCopy.payoff };
}

export function getUpgradeCardMeta(game, upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  const runPhase = getRunPhase(game);
  const dominant = getDominantBuild(game);
  const focus = key ? getBuildFocus(game, key) : 0;
  const pickCount = getUpgradePickCount(game, upgrade.id);
  const synergyMatches = getUpgradeSynergyMatches(game, upgrade);
  const primarySynergy = synergyMatches[0];
  const improvesSynergy = primarySynergy ? primarySynergy.nextLevel > primarySynergy.currentLevel : false;
  const unlocksWeapon = key && !isWeaponFamilyUnlocked(game, key);
  const phaseRecommended = Boolean(
    (runPhase.id === 'anchor' && (key === 'orb' || upgrade.id === 'magnet' || upgrade.id === 'speed' || upgrade.id === 'maxHp'))
    || (runPhase.id === 'armory' && (unlocksWeapon || key === dominant?.key))
    || (runPhase.id === 'synergy' && (improvesSynergy || (key && dominant?.key === key && focus >= 2)))
    || (runPhase.id === 'final' && (upgrade.id === 'maxHp' || upgrade.id === 'dash' || upgrade.id === 'cooldown' || upgrade.id === 'damage'))
  );
  const tags = [];
  let role = WEAPON_UPGRADE_IDS.has(upgrade.id) ? '무기 성장' : '공용 강화';

  if (unlocksWeapon) {
    role = '새 무기 해금';
    tags.push('신규 무기');
  } else if (key && STARTING_WEAPON_FAMILIES.has(key) && focus === 0) {
    role = '기본 무기 강화';
    tags.push('초반 안정');
  } else if (improvesSynergy) {
    role = '조합 완성';
    tags.push(primarySynergy.title);
  } else if (primarySynergy) {
    role = '조합 강화';
    tags.push(primarySynergy.label);
  } else if (key && dominant?.key === key && dominant.focus >= 1) {
    role = '주력 강화';
    tags.push('시너지');
  } else if (key && focus === 0) {
    role = '새 빌드';
    tags.push('선택지 확장');
  } else if (key) {
    role = '집중 강화';
    tags.push('빌드 집중');
  }

  if (upgrade.id === 'maxHp' || upgrade.id === 'dash' || upgrade.id === 'speed') {
    role = '생존';
    tags.push('안정');
  }
  if (upgrade.id === 'magnet' || upgrade.id === 'luck') {
    role = '성장';
    tags.push('XP 가속');
  }
  if (upgrade.id === 'damage' || upgrade.id === 'cooldown') {
    role = '공용 화력';
    tags.push('전체 무기');
  }

  if (pickCount > 0) tags.push(`랭크 ${formatFocusLevel(pickCount + 1)}`);
  if (key && focus + 1 >= 3) tags.push('각성 임박');
  if (improvesSynergy) tags.push(`공명 ${formatFocusLevel(primarySynergy.nextLevel)}`);
  if (phaseRecommended) tags.push(runPhase.title);
  if (upgrade.id === 'heal' || (upgrade.id === 'maxHp' && game.stats.hp / game.stats.maxHp < 0.7)) tags.push('위기 대응');
  if (tags.length < 2) tags.push(upgrade.branch);

  const recommended = Boolean(
    unlocksWeapon
    || improvesSynergy
    || phaseRecommended
    || (key && dominant?.key === key && dominant.focus >= 2)
    || (key && focus === 0 && game.level <= 5)
    || (upgrade.id === 'maxHp' && game.stats.hp / game.stats.maxHp < 0.72)
    || (upgrade.id === 'magnet' && game.level <= 4)
    || ((upgrade.id === 'damage' || upgrade.id === 'cooldown') && game.upgrades.length >= 4)
  );
  const reason = unlocksWeapon
    ? '새 무기'
    : improvesSynergy
      ? '조합 완성'
      : key && dominant?.key === key && dominant.focus >= 2
        ? '주력 빌드'
        : key && focus === 0
          ? '빌드 확장'
          : upgrade.id === 'maxHp' && game.stats.hp / game.stats.maxHp < 0.72
            ? '위기 대응'
            : upgrade.id === 'magnet' && game.level <= 4
              ? '초반 성장'
              : upgrade.id === 'cooldown' || upgrade.id === 'damage'
                ? '전체 효율'
                : phaseRecommended
                  ? runPhase.title
                  : pickCount > 0
                    ? `중첩 ${formatFocusLevel(pickCount + 1)}`
                    : key
                      ? BUILD_FOCUS_META[key].label
                      : upgrade.branch;
  const context = {
    key,
    dominant,
    focus,
    primarySynergy,
    improvesSynergy,
    unlocksWeapon,
    pickCount
  };
  const decisionCopy = getUpgradeDecisionCopy(game, upgrade, context);
  const quickRead = getUpgradeQuickRead(game, upgrade, context, decisionCopy);
  const rarity = improvesSynergy
    ? 'mythic'
    : unlocksWeapon
      ? 'rare'
      : recommended
        ? 'uncommon'
        : pickCount > 0
          ? 'uncommon'
          : 'common';
  const rarityLabel = {
    common: '일반',
    uncommon: recommended ? '추천' : '강화',
    rare: '신규',
    mythic: '공명'
  }[rarity];

  return {
    role,
    badge: role === upgrade.family ? reason : role,
    impact: getUpgradeImpactLabel(upgrade),
    decision: decisionCopy.decision,
    payoff: decisionCopy.payoff,
    quickLead: quickRead.quickLead,
    quickSummary: quickRead.quickSummary,
    statLine: getUpgradeStatLine(upgrade),
    reason,
    recommended,
    rarity,
    rarityLabel,
    tags: [...new Set(tags.filter(tag => tag !== upgrade.branch))].slice(0, 2)
  };
}

export function getUpgradePickCount(game, id) {
  return game?.upgrades?.filter(upgradeId => upgradeId === id).length ?? 0;
}

export function getUpgradeDisplayTitle(game, upgrade) {
  const count = getUpgradePickCount(game, upgrade.id);
  return count > 0 ? `${upgrade.title} ${formatFocusLevel(count + 1)}` : upgrade.title;
}

export function formatFocusLevel(focus) {
  return ['0', 'I', 'II', 'III', 'IV', 'V', 'VI'][Math.min(6, Math.max(0, focus))];
}

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
    || game.upgrades.length >= 6;
}

function canDraftNewWeaponFamily(game) {
  return game.level >= NEW_WEAPON_UNLOCK_LEVEL
    || game.time >= NEW_WEAPON_UNLOCK_TIME
    || getItemPickupCount(game, 'cache') >= NEW_WEAPON_UNLOCK_CACHE_COUNT
    || (game.shrineActivations ?? 0) >= NEW_WEAPON_UNLOCK_SHRINE_COUNT;
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
    weight += focus * 0.48;
    if (!isWeaponFamilyUnlocked(game, key)) weight += game.level <= 7 ? 0.72 : 0.9;
    if (synergyDelta) weight += 1.7;
    if (dominant?.key === key) weight += 1.15;
    if (focus === 0 && game.level <= 8) weight += key === 'orb' ? 0.96 : 0.62;
    if (game.level <= 5 && key === 'orb') weight += 0.42;
    if (runPhase.id === 'anchor' && key === 'orb') weight += 0.35;
    if (runPhase.id === 'armory' && !isWeaponFamilyUnlocked(game, key)) weight += 0.75;
    if (runPhase.id === 'synergy' && synergyDelta) weight += 0.72;
    if (runPhase.id === 'final' && dominant?.key === key) weight += 0.35;
  } else {
    if (upgrade.id === 'maxHp' && game.stats.hp / game.stats.maxHp < 0.72) weight += 1.25;
    if (upgrade.id === 'magnet' && game.level <= 4) weight += 0.55;
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
  const newWeaponUnlocked = canDraftNewWeaponFamily(game);
  const lockedWeaponChoices = weaponChoices.filter(upgrade => {
    const key = getUpgradeFocusKey(upgrade);
    return key && !isWeaponFamilyUnlocked(game, key);
  });
  const dominant = getDominantBuild(game);
  const choices = [];

  if (game.level <= 3) {
    addDraftChoice(choices, starterChoices, game);
    addDraftChoice(choices, utilityChoices, game);
  } else if (game.level <= 5) {
    addDraftChoice(choices, starterChoices, game);
    addDraftChoice(choices, utilityChoices, game);
  } else if (game.level <= 7) {
    addDraftChoice(choices, starterChoices, game);
    if (newWeaponUnlocked) addDraftChoice(choices, lockedWeaponChoices, game);
  }
  if (dominant?.focus >= 2) {
    addDraftChoice(choices, weaponChoices.filter(upgrade => getUpgradeFocusKey(upgrade) === dominant.key), game);
  }
  addDraftChoice(choices, weaponChoices.filter(upgrade => getUpgradeSynergyMatches(game, upgrade).some(synergy => synergy.nextLevel > synergy.currentLevel)), game);
  if (newWeaponUnlocked && game.level >= 4 && game.level <= 8) {
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
