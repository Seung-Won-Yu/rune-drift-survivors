export const ARENA_RADIUS = 118;
export const RUN_DURATION = 300;
export const PLAYER_SPEED = 8.7;
export const DASH_SPEED = 22;
export const DASH_TIME = 0.2;
export const DASH_COOLDOWN = 1.15;
export const PLAYER_RADIUS = 0.58;
export const MAX_ENEMIES = 96;
export const WAVE_DURATION = 22;
export const MAX_FIELD_ITEMS = 12;
export const MAX_XP_GEMS = 160;
export const MAX_PROJECTILES = 96;
export const MAX_HIT_BURSTS = 20;
export const MAX_WEAPON_EFFECTS = 12;
export const MAX_DAMAGE_NUMBERS = 16;
export const MAX_SPAWN_WARNINGS = 6;
export const MAX_ORBIT_BLADES = 12;
export const PROJECTILE_GRID_CELL_SIZE = 9;
export const PROJECTILE_GRID_KEY_STRIDE = 1024;
export const STATIC_COLLIDER_GRID_CELL_SIZE = 18;
export const STATIC_COLLIDER_GRID_KEY_STRIDE = 1024;
export const STATE_SYNC_INTERVAL = 0.1;
export const BALANCED_STATE_SYNC_INTERVAL = 0.16;
export const LOW_STATE_SYNC_INTERVAL = 0.24;
export const OVERLOAD_DURATION = 8;
export const XP_BASE_MAGNET_RADIUS = 8.2;
export const XP_PICKUP_RADIUS = 1.3;
export const FIELD_ITEM_ATTRACT_RADIUS = 12;
export const FIELD_ITEM_PICKUP_RADIUS = 3.05;
export const SHRINE_ACTIVATE_RADIUS = 6.4;
export const SHRINE_CHANNEL_TIME = 1.15;
export const PLAYER_VISUAL_BASE_SCALE = 1.52;

export const STARTING_WEAPON_FAMILIES = new Set(['orb']);
export const ADVANCED_ORB_UNLOCK_LEVEL = 4;
export const ADVANCED_ORB_UNLOCK_TIME = 72;
export const GLOBAL_POWER_UNLOCK_LEVEL = 6;
export const GLOBAL_POWER_UNLOCK_TIME = 108;
export const NEW_WEAPON_UNLOCK_LEVEL = 7;
export const NEW_WEAPON_UNLOCK_TIME = 128;
export const NEW_WEAPON_UNLOCK_CACHE_COUNT = 2;
export const NEW_WEAPON_UNLOCK_SHRINE_COUNT = 2;
export const ARMORY_DOUBLE_BOOST_TIME = 190;
export const ARMORY_TRIPLE_BOOST_TIME = 260;
export const UPGRADE_CHOICE_COUNT = 3;
export const ADVANCED_ORB_UPGRADE_IDS = new Set(['orb-fan', 'orb-lance']);
export const GLOBAL_POWER_UPGRADE_IDS = new Set(['damage', 'cooldown']);

export const VISUAL_BUDGETS = {
  high: {
    enemyAuras: 26,
    enemyAccents: 30,
    gemBeams: 10,
    projectileAura: 20,
    projectileDetail: 6,
    hitBursts: 8,
    weaponEffects: 4,
    damageNumbers: 10,
    spawnWarnings: 4
  },
  balanced: {
    enemyAuras: 10,
    enemyAccents: 12,
    gemBeams: 0,
    projectileAura: 6,
    projectileDetail: 0,
    hitBursts: 3,
    weaponEffects: 1,
    damageNumbers: 3,
    spawnWarnings: 2
  },
  low: {
    enemyAuras: 3,
    enemyAccents: 4,
    gemBeams: 0,
    projectileAura: 3,
    projectileDetail: 0,
    hitBursts: 1,
    weaponEffects: 1,
    damageNumbers: 1,
    spawnWarnings: 2
  }
};

export const RUNTIME_BUDGETS = {
  high: {
    maxEnemies: 68,
    maxProjectiles: 58,
    maxXpGems: 100
  },
  balanced: {
    maxEnemies: 40,
    maxProjectiles: 30,
    maxXpGems: 56
  },
  low: {
    maxEnemies: 24,
    maxProjectiles: 16,
    maxXpGems: 32
  }
};
