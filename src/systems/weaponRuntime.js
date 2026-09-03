import {
  getBuildFocus,
  getSynergyLevel,
  getWeaponStage,
  isWeaponFamilyUnlocked
} from './progression.js';
import { getCircuitFinaleState } from './runeCircuit.js';
import {
  getBladeSweepProfile,
  updateBladeWeapon
} from './weapon-runtime/bladeWeaponRuntime.js';
import { updateLightningWeapon } from './weapon-runtime/lightningWeaponRuntime.js';
import { updateNovaWeapon } from './weapon-runtime/novaWeaponRuntime.js';
import { updateOrbWeapon } from './weapon-runtime/orbWeaponRuntime.js';
import { updateStormWeapon } from './weapon-runtime/stormWeaponRuntime.js';

export function updateWeaponCasts(context) {
  const {
    dt,
    currentGame,
    orbTimer,
    bladeTimer,
    stormTimer,
    lightningTimer,
    novaTimer
  } = context;
  const stats = currentGame.stats;
  const weaponStage = getWeaponStage(currentGame);
  const overloadDamage = currentGame.overloadTimer > 0 ? 1.25 : 1;
  const overloadCooldown = currentGame.overloadTimer > 0 ? 0.58 : 1;
  const circuitFinale = getCircuitFinaleState(currentGame);
  const common = {
    stats,
    weaponStage,
    overloadDamage,
    overloadCooldown,
    circuitFinale
  };

  orbTimer.current -= dt;
  bladeTimer.current -= dt;
  stormTimer.current -= dt;
  lightningTimer.current -= dt;
  novaTimer.current -= dt;

  const orbFocus = getBuildFocus(currentGame, 'orb');
  const stormFocus = getBuildFocus(currentGame, 'storm');
  const chainFocus = getBuildFocus(currentGame, 'chain');
  const novaFocus = getBuildFocus(currentGame, 'nova');
  const stormChainLevel = getSynergyLevel(currentGame, 'storm-chain');
  const bladeNovaLevel = getSynergyLevel(currentGame, 'blade-nova');
  const orbPierceLevel = getSynergyLevel(currentGame, 'orb-pierce');

  updateOrbWeapon(context, common, orbFocus, orbPierceLevel);
  updateBladeWeapon(context, getBladeSweepProfile(currentGame));
  updateStormWeapon(
    context,
    common,
    stormFocus,
    stormChainLevel,
    isWeaponFamilyUnlocked(currentGame, 'storm')
  );
  updateLightningWeapon(
    context,
    common,
    chainFocus,
    stormChainLevel,
    isWeaponFamilyUnlocked(currentGame, 'chain')
  );
  updateNovaWeapon(
    context,
    common,
    novaFocus,
    bladeNovaLevel,
    isWeaponFamilyUnlocked(currentGame, 'nova')
  );
}

export { getBladeSweepProfile } from './weapon-runtime/bladeWeaponRuntime.js';
export {
  getLightningDamageFalloff,
  getLightningTargetCount
} from './weapon-runtime/lightningWeaponRuntime.js';
export { getStormStrikeCount } from './weapon-runtime/stormWeaponRuntime.js';
