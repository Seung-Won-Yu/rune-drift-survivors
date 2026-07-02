import { Suspense } from 'react';
import {
  MODEL_URLS,
  PROJECTILE_MODEL_URLS
} from '../config/assets.js';
import { ART_TOKENS } from '../config/gameData.js';
import { MAX_XP_GEMS } from '../config/gameTuning.js';
import { getVisualBudget } from '../hooks/useVisualQuality.js';
import { BossNameplates, BossPresence } from './BossIndicators.jsx';
import { DamageNumber, HitBurst, SpawnWarning } from './CombatFeedback.jsx';
import { EnemyAccents, EnemyGroundAuras } from './EnemyEffects.jsx';
import { SourceEnemyInstances, StylizedEnemyInstances } from './EnemyInstances.jsx';
import { FieldPickupItems, GemBeacons, RuneShrineSites } from './FieldItemsAndShrines.jsx';
import { MapBaseArena } from './MapBaseArena.jsx';
import { OrbitBlades, PlayerAvatar } from './PlayerAvatar.jsx';
import { PlayerPresence } from './PlayerPresence.jsx';
import { SourceProjectileInstances, StylizedProjectileInstances } from './ProjectileInstances.jsx';
import { ProjectileAuraRings, WeaponStrikeEffects } from './WeaponEffects.jsx';
import { ArenaAtmosphere } from './ArenaAtmosphere.jsx';

export function GameWorld({
  game,
  visualQuality,
  player,
  playerMesh,
  enemies,
  gemMesh,
  xpGems,
  fieldItems,
  shrines,
  projectiles,
  weaponEffects,
  hitBursts,
  damageNumbers,
  spawnWarnings
}) {
  const visualBudget = getVisualBudget(visualQuality);

  return (
    <>
      <hemisphereLight args={['#fff0bd', '#517d47', 0.82]} />
      <ambientLight intensity={0.38} />
      <directionalLight
        castShadow={false}
        position={[24, 34, 18]}
        intensity={visualQuality === 'low' ? 2.25 : 2.55}
        color="#fff0bd"
      />
      {visualQuality !== 'low' && <directionalLight position={[-34, 20, -48]} intensity={0.44} color="#b9e9ff" />}
      <pointLight position={[0, 2.4, 0]} intensity={visualQuality === 'low' ? 0.95 : 1.35} color={ART_TOKENS.wornGold} distance={14} />
      {visualQuality === 'high' && <pointLight position={[0, 5.8, 0]} intensity={0.72} color={ART_TOKENS.runeMint} distance={34} />}
      {visualQuality === 'high' && <pointLight position={[-42, 3.2, -22]} intensity={0.5} color="#ffdca2" distance={38} />}
      {visualQuality === 'high' && <pointLight position={[48, 3.2, 26]} intensity={0.48} color="#b7ef9d" distance={34} />}
      <MapBaseArena visualQuality={visualQuality} />
      {visualQuality !== 'low' && <ArenaAtmosphere />}
      <Suspense fallback={null}>
        <PlayerAvatar rootRef={playerMesh} game={game} player={player} visualQuality={visualQuality} />
      </Suspense>
      <PlayerPresence player={player} game={game} visualQuality={visualQuality} />
      <Suspense fallback={null}>
        <OrbitBlades player={player} game={game} visualQuality={visualQuality} />
      </Suspense>
      <EnemyGroundAuras enemiesRef={enemies} visualQuality={visualQuality} />
      <EnemyAccents enemiesRef={enemies} visualQuality={visualQuality} />
      {visualQuality === 'high' ? (
        <Suspense fallback={null}>
          <SourceEnemyInstances enemiesRef={enemies} kind="golem" url={MODEL_URLS.golem} scaleMultiplier={2.42} materialTone="#638f5e" visualQuality={visualQuality} />
          <SourceEnemyInstances enemiesRef={enemies} kind="runner" url={MODEL_URLS.runner} scaleMultiplier={2.82} materialTone="#4d6fa5" visualQuality={visualQuality} />
          <SourceEnemyInstances enemiesRef={enemies} kind="brute" url={MODEL_URLS.brute} scaleMultiplier={2.92} materialTone="#b84f42" visualQuality={visualQuality} />
          <SourceEnemyInstances enemiesRef={enemies} kind="elite" url={MODEL_URLS.boss} scaleMultiplier={1.26} materialTone="#8b6cc0" visualQuality={visualQuality} />
          <SourceEnemyInstances enemiesRef={enemies} kind="boss" url={MODEL_URLS.boss} scaleMultiplier={2.05} materialTone="#b08a48" visualQuality={visualQuality} />
        </Suspense>
      ) : (
        <StylizedEnemyInstances enemiesRef={enemies} visualQuality={visualQuality} />
      )}
      <BossNameplates enemiesRef={enemies} />
      <BossPresence enemiesRef={enemies} />
      <instancedMesh ref={gemMesh} args={[null, null, MAX_XP_GEMS]} frustumCulled={false}>
        <octahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial color="#9ff7ff" emissive="#38d9ff" emissiveIntensity={3.5} roughness={0.18} toneMapped={false} />
      </instancedMesh>
      {visualQuality === 'high' && <GemBeacons gemsRef={xpGems} visualQuality={visualQuality} />}
      <FieldPickupItems itemsRef={fieldItems} visualQuality={visualQuality} />
      <RuneShrineSites shrinesRef={shrines} visualQuality={visualQuality} />
      {visualQuality === 'high' ? (
        <Suspense fallback={null}>
          <SourceProjectileInstances projectilesRef={projectiles} type="orb" url={PROJECTILE_MODEL_URLS.orb} scaleMultiplier={1.25} visualQuality={visualQuality} />
          <SourceProjectileInstances projectilesRef={projectiles} type="storm" url={PROJECTILE_MODEL_URLS.storm} scaleMultiplier={1.85} visualQuality={visualQuality} />
        </Suspense>
      ) : (
        <StylizedProjectileInstances projectilesRef={projectiles} visualQuality={visualQuality} />
      )}
      <ProjectileAuraRings projectilesRef={projectiles} game={game} visualQuality={visualQuality} />
      <WeaponStrikeEffects effectsRef={weaponEffects} visualQuality={visualQuality} />
      {hitBursts.current.slice(0, visualBudget.hitBursts).map((burst, index) => (
        <HitBurst key={`${index}-${burst.maxLife}`} burst={burst} visualQuality={visualQuality} />
      ))}
      {damageNumbers.current.slice(0, visualBudget.damageNumbers).map((number, index) => (
        <DamageNumber key={`${index}-${number.value}-${number.maxLife}`} number={number} />
      ))}
      {spawnWarnings.current.slice(0, visualBudget.spawnWarnings).map((warning, index) => (
        <SpawnWarning key={`${index}-${warning.maxLife}`} warning={warning} visualQuality={visualQuality} />
      ))}
    </>
  );
}
