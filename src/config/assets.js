const withBase = path => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

export const MODEL_URLS = {
  player: withBase('models/player-wizard.glb'),
  golem: withBase('models/enemy-demon.glb'),
  runner: withBase('models/enemy-bat-source.glb'),
  brute: withBase('models/enemy-cyclops.glb'),
  boss: withBase('models/boss-cthulhu.glb')
};

export const PROJECTILE_MODEL_URLS = {
  orb: withBase('models/projectile-orb.glb'),
  storm: withBase('models/projectile-storm.glb'),
  orbitBlade: withBase('models/orbit-blade.glb')
};

export const NATURE_MODEL_URLS = {
  pineTall: withBase('models/nature-kit/tree_pineTallA.glb'),
  pineRound: withBase('models/nature-kit/tree_pineRoundC.glb'),
  treeDefault: withBase('models/nature-kit/tree_default.glb'),
  rockLargeA: withBase('models/nature-kit/rock_largeA.glb'),
  rockTall: withBase('models/nature-kit/rock_tallE.glb'),
  bushLarge: withBase('models/nature-kit/plant_bushLarge.glb'),
  grassLarge: withBase('models/nature-kit/grass_leafsLarge.glb')
};

export const PRELOAD_MODEL_URLS = [
  ...Object.values(MODEL_URLS),
  ...Object.values(PROJECTILE_MODEL_URLS),
  ...Object.values(NATURE_MODEL_URLS)
];
