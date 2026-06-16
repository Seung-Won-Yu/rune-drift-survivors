export const MODEL_URLS = {
  player: '/models/player-wizard.glb',
  golem: '/models/enemy-demon.glb',
  runner: '/models/enemy-bat-source.glb',
  brute: '/models/enemy-cyclops.glb',
  boss: '/models/boss-cthulhu.glb'
};

export const PROJECTILE_MODEL_URLS = {
  orb: '/models/projectile-orb.glb',
  storm: '/models/projectile-storm.glb',
  orbitBlade: '/models/orbit-blade.glb'
};

export const NATURE_MODEL_URLS = {
  pineTall: '/models/nature-kit/tree_pineTallA.glb',
  pineRound: '/models/nature-kit/tree_pineRoundC.glb',
  treeDefault: '/models/nature-kit/tree_default.glb',
  rockLargeA: '/models/nature-kit/rock_largeA.glb',
  rockTall: '/models/nature-kit/rock_tallE.glb',
  bushLarge: '/models/nature-kit/plant_bushLarge.glb',
  grassLarge: '/models/nature-kit/grass_leafsLarge.glb'
};

export const PRELOAD_MODEL_URLS = [
  ...Object.values(MODEL_URLS),
  ...Object.values(PROJECTILE_MODEL_URLS),
  ...Object.values(NATURE_MODEL_URLS)
];
