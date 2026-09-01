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
import { EnemyContactTelegraphs } from './EnemyContactTelegraphs.jsx';
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
  const shadowMapSize = visualQuality === 'high' ? 1536 : 1024;

  return (
    <>
      <hemisphereLight args={['#d9e5d6', '#18352c', visualQuality === 'low' ? 0.72 : 0.72]} />
      <ambientLight intensity={visualQuality === 'low' ? 0.3 : 0.26} />
      <directionalLight
        castShadow={visualQuality !== 'low'}
        position={[24, 34, 18]}
        intensity={visualQuality === 'low' ? 1.52 : 1.9}
        color="#e3e2ca"
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={-64}
        shadow-camera-right={64}
        shadow-camera-top={64}
        shadow-camera-bottom={-64}
        shadow-camera-near={1}
        shadow-camera-far={112}
        shadow-bias={-0.00035}
        shadow-normalBias={0.035}
      />
      {visualQuality !== 'low' && <directionalLight position={[-34, 20, -48]} intensity={0.34} color="#75cfc7" />}
      <pointLight position={[0, 2.4, 0]} intensity={visualQuality === 'low' ? 0.46 : 0.64} color={ART_TOKENS.wornGold} distance={13} />
      {visualQuality === 'high' && <pointLight position={[0, 5.8, 0]} intensity={0.34} color={ART_TOKENS.runeMint} distance={32} />}
      {visualQuality === 'high' && <pointLight position={[-42, 3.2, -22]} intensity={0.25} color="#b9915f" distance={34} />}
      {visualQuality === 'high' && <pointLight position={[48, 3.2, 26]} intensity={0.28} color="#609c86" distance={32} />}
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
      <EnemyContactTelegraphs enemiesRef={enemies} visualQuality={visualQuality} />
      <EnemyAccents enemiesRef={enemies} visualQuality={visualQuality} />
      {visualQuality === 'high' ? (
        <Suspense fallback={null}>
          <SourceEnemyInstances enemiesRef={enemies} kind="golem" url={MODEL_URLS.golem} scaleMultiplier={2.42} materialTone="#557d51" visualQuality={visualQuality} />
          <SourceEnemyInstances enemiesRef={enemies} kind="runner" url={MODEL_URLS.runner} scaleMultiplier={2.82} materialTone="#41658e" visualQuality={visualQuality} />
          <SourceEnemyInstances enemiesRef={enemies} kind="brute" url={MODEL_URLS.brute} scaleMultiplier={2.92} materialTone="#99473b" visualQuality={visualQuality} />
          <SourceEnemyInstances enemiesRef={enemies} kind="elite" url={MODEL_URLS.boss} scaleMultiplier={1.26} materialTone="#765c9b" visualQuality={visualQuality} />
          <SourceEnemyInstances enemiesRef={enemies} kind="boss" url={MODEL_URLS.boss} scaleMultiplier={2.05} materialTone="#93723f" visualQuality={visualQuality} />
        </Suspense>
      ) : (
        <StylizedEnemyInstances enemiesRef={enemies} visualQuality={visualQuality} />
      )}
      <BossNameplates enemiesRef={enemies} />
      <BossPresence enemiesRef={enemies} />
      <instancedMesh ref={gemMesh} args={[null, null, MAX_XP_GEMS]} frustumCulled={false}>
        <octahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial color="#82dbe7" emissive="#2da4bd" emissiveIntensity={2.2} roughness={0.22} toneMapped={false} />
      </instancedMesh>
      {visualQuality === 'high' && <GemBeacons gemsRef={xpGems} visualQuality={visualQuality} />}
      <FieldPickupItems itemsRef={fieldItems} visualQuality={visualQuality} />
      <RuneShrineSites game={game} shrinesRef={shrines} visualQuality={visualQuality} />
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
