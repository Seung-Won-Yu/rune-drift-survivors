const withBase = path => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

export const SPRITE_URLS = {
  runeWarden: withBase('sprites/rune-warden-animation-atlas-v2.webp'),
  riftbornCommon: withBase('sprites/riftborn-common-animation-atlas-v1.webp'),
  riftbornThreat: withBase('sprites/riftborn-threat-animation-atlas-v1.webp')
};
