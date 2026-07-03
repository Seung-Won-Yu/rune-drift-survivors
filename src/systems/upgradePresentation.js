import { STARTING_WEAPON_FAMILIES } from '../config/gameTuning.js';
import {
  BUILD_FOCUS_META,
  WEAPON_UPGRADE_IDS
} from '../config/upgrades.js';
import {
  formatFocusLevel,
  getBuildFocus,
  getDominantBuild,
  getRunPhase,
  getUpgradeFocusKey,
  getUpgradePickCount,
  getUpgradeSynergyMatches,
  getWeaponFamilyRankProgress,
  isWeaponFamilyUnlocked
} from './progression.js';

export function getUpgradeTone(upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  return key ? BUILD_FOCUS_META[key].color : '#d4a84c';
}

export function getUpgradeIconMeta(upgrade) {
  const key = getUpgradeFocusKey(upgrade);
  if (key && BUILD_FOCUS_META[key]) return BUILD_FOCUS_META[key];
  if (upgrade.id === 'maxHp') return { glyph: '+', color: '#79f29a' };
  if (upgrade.id === 'dash' || upgrade.id === 'speed') return { glyph: '›', color: '#64c98d' };
  if (upgrade.id === 'magnet' || upgrade.id === 'luck') return { glyph: '✦', color: '#d4a84c' };
  return { glyph: '✚', color: '#d4a84c' };
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
  const rankProgress = key ? getWeaponFamilyRankProgress(game, key, true) : null;
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

  if (rankProgress) tags.push(`${rankProgress.next}/${rankProgress.limit}`);
  if (pickCount > 0) tags.push(`랭크 ${formatFocusLevel(pickCount + 1)}`);
  if (key && focus + 1 >= 3 && rankProgress?.next < rankProgress?.limit) tags.push('각성 임박');
  if (rankProgress?.next >= rankProgress?.limit) tags.push('무기 완성');
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
    progressLabel: rankProgress
      ? `무기 랭크 ${rankProgress.next}/${rankProgress.limit}`
      : '',
    tags: [...new Set(tags.filter(tag => tag !== upgrade.branch))].slice(0, 2)
  };
}

export function getUpgradeDisplayTitle(game, upgrade) {
  const count = getUpgradePickCount(game, upgrade.id);
  return count > 0 ? `${upgrade.title} ${formatFocusLevel(count + 1)}` : upgrade.title;
}
