export const ART_TOKENS = {
  void: '#06100e',
  deepVoid: '#0b1815',
  terrainLow: '#162923',
  terrainMid: '#294239',
  terrainHigh: '#56645a',
  moss: '#2f5b4d',
  oldStone: '#65736b',
  wornGold: '#b58a45',
  emberGold: '#e2ad58',
  runeCyan: '#75ddd2',
  runeMint: '#77c8a4',
  dangerRed: '#e06b5f',
  elderViolet: '#aa91cf',
  riftViolet: '#8274c5',
  pathDust: '#776c56',
  ashStone: '#51483e'
};

export const SHRINE_VISUALS = {
  armory: {
    kind: 'armory',
    surface: '#8a6d45',
    shadow: '#4b3c31',
    accent: ART_TOKENS.wornGold,
    path: '#8d7350'
  },
  vital: {
    kind: 'vital',
    surface: '#4d7e5f',
    shadow: '#27483b',
    accent: '#79f29a',
    path: '#608668'
  },
  purge: {
    kind: 'purge',
    surface: '#806044',
    shadow: '#45372f',
    accent: ART_TOKENS.emberGold,
    path: '#8b704f'
  },
  etching: {
    kind: 'etching',
    surface: '#625777',
    shadow: '#373247',
    accent: ART_TOKENS.elderViolet,
    path: '#73698a'
  }
};
