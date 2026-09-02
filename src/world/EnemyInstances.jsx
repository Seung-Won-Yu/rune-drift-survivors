import { useEffect, useMemo, useRef } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { SPRITE_URLS } from '../config/assets.js';
import { MAX_ENEMIES, SIMULATION_BUDGET } from '../config/gameTuning.js';
import { useVisualFrameGate } from '../hooks/useVisualFrameGate.js';
import {
  getEnemyContactDisplacement,
  getEnemyContactWindupProgress
} from '../systems/enemyContactRuntime.js';
import {
  RIFTBORN_COMMON_ATLAS,
  RIFTBORN_THREAT_ATLAS,
  getRiftbornAnimationFrame,
  getRiftbornThreatAnimationFrame
} from '../systems/enemySprite.js';
import { getTerrainHeight } from '../systems/terrain.js';
import { syncInstanceMeshes } from './instancedMeshUtils.js';
import { NEUTRAL_KEY_ALPHA_TEST, applyNeutralKeyFragment } from './neutralKeyShader.js';

const COMMON_SPRITE_META = Object.freeze({
  runner: Object.freeze({ width: 2.5, height: 3.8, lift: 0.2, tint: '#3aa6c2' }),
  golem: Object.freeze({ width: 3.2, height: 3.6, lift: 0.12, tint: '#6f8f47' }),
  brute: Object.freeze({ width: 3.7, height: 3.3, lift: 0.08, tint: '#a94732' })
});

const THREAT_SPRITE_META = Object.freeze({
  bulwark: Object.freeze({ width: 3.65, height: 4.15, lift: 0.1, tint: '#8e68bd' }),
  charger: Object.freeze({ width: 3.5, height: 3.85, lift: 0.16, tint: '#c05248' }),
  summoner: Object.freeze({ width: 3.15, height: 4.35, lift: 0.24, tint: '#9f7ad0' }),
  boss: Object.freeze({ width: 4.85, height: 5.2, lift: 0.12, tint: '#d4a84c' })
});

function useAtlasMaterial(url, atlas, cacheKey) {
  const sourceTexture = useTexture(url);
  const texture = useMemo(() => {
    const next = sourceTexture.clone();
    next.colorSpace = THREE.SRGBColorSpace;
    next.wrapS = THREE.ClampToEdgeWrapping;
    next.wrapT = THREE.ClampToEdgeWrapping;
    next.generateMipmaps = false;
    next.minFilter = THREE.LinearFilter;
    next.magFilter = THREE.LinearFilter;
    next.needsUpdate = true;
    return next;
  }, [sourceTexture]);
  const material = useMemo(() => {
    const next = new THREE.MeshBasicMaterial({
      map: texture,
      color: '#ffffff',
      transparent: true,
      alphaTest: NEUTRAL_KEY_ALPHA_TEST,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide
    });
    next.onBeforeCompile = shader => {
      shader.vertexShader = `attribute vec2 instanceRuneUv;
      attribute vec3 instanceRuneTint;
      varying vec3 vRuneTint;
      ${shader.vertexShader}`;
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        `void main() {
        vRuneTint = instanceRuneTint;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        #ifdef USE_MAP
          vMapUv = uv * vec2(${1 / atlas.columns}, ${1 / atlas.rows}) + instanceRuneUv;
        #endif`
      );
      shader.fragmentShader = `varying vec3 vRuneTint;\n${shader.fragmentShader}`;
      applyNeutralKeyFragment(shader, 'diffuseColor.rgb += vRuneTint * 0.02;');
    };
    next.customProgramCacheKey = () => cacheKey;
    return next;
  }, [atlas.columns, atlas.rows, cacheKey, texture]);

  useEffect(() => () => {
    material.dispose();
    texture.dispose();
  }, [material, texture]);

  return material;
}

export function StylizedEnemyInstances({ enemiesRef, visualQuality = 'balanced' }) {
  const commonRef = useRef();
  const commonShadowRef = useRef();
  const commonUvRef = useRef();
  const commonTintRef = useRef();
  const threatRef = useRef();
  const threatShadowRef = useRef();
  const threatUvRef = useRef();
  const threatTintRef = useRef();
  const enemyLimit = SIMULATION_BUDGET.maxEnemies;
  const shouldRenderVisualFrame = useVisualFrameGate(visualQuality, 36, 22);
  const commonMaterial = useAtlasMaterial(
    SPRITE_URLS.riftbornCommon,
    RIFTBORN_COMMON_ATLAS,
    'riftborn-common-atlas-v7-clean-edge'
  );
  const threatMaterial = useAtlasMaterial(
    SPRITE_URLS.riftbornThreat,
    RIFTBORN_THREAT_ATLAS,
    'riftborn-threat-atlas-v2-clean-edge'
  );
  const local = useMemo(() => ({
    pos: new THREE.Vector3(),
    scale: new THREE.Vector3(),
    quat: new THREE.Quaternion(),
    shadowQuat: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)),
    matrix: new THREE.Matrix4(),
    color: new THREE.Color(),
    flashColor: new THREE.Color('#d4a84c'),
    forward: new THREE.Vector3()
  }), []);

  useFrame(state => {
    if (!commonRef.current || !commonShadowRef.current || !commonUvRef.current || !commonTintRef.current || !threatRef.current || !threatShadowRef.current || !threatUvRef.current || !threatTintRef.current) return;
    if (!shouldRenderVisualFrame(state.clock.elapsedTime)) return;
    let commonCount = 0;
    let threatCount = 0;

    for (const enemy of enemiesRef.current) {
      if (commonCount + threatCount >= enemyLimit) break;
      const isThreat = enemy.kind === 'elite' || enemy.kind === 'boss';
      const role = enemy.kind === 'boss' ? 'boss' : enemy.role ?? 'charger';
      const spriteMeta = isThreat
        ? THREAT_SPRITE_META[role] ?? THREAT_SPRITE_META.charger
        : COMMON_SPRITE_META[enemy.kind] ?? COMMON_SPRITE_META.golem;
      const hitReact = THREE.MathUtils.clamp((enemy.flash ?? 0) / 0.18, 0, 1);
      const chargePower = enemy.chargeTimer > 0 ? 1 : 0;
      const contactPower = getEnemyContactWindupProgress(enemy);
      const contactImpact = THREE.MathUtils.clamp((enemy.contactAttackPulse ?? 0) / 0.34, 0, 1);
      const guardPower = enemy.bossGuard > 0 ? 1 : 0;
      const motionIntent = enemy.motionIntent ?? 0.55;
      const wobble = enemy.wobble ?? 0;
      const strideRate = enemy.kind === 'runner' ? 2.1 : enemy.kind === 'boss' ? 0.54 : 1.05;
      const step = Math.sin(wobble * strideRate);
      const bob = Math.max(0, step) * spriteMeta.lift * (0.66 + motionIntent * 0.28)
        + hitReact * 0.08 + chargePower * 0.05 - contactPower * 0.08 + contactImpact * 0.1;
      const frame = isThreat
        ? getRiftbornThreatAnimationFrame({
          kind: enemy.kind,
          role: enemy.role,
          facingAngle: enemy.facingAngle ?? wobble,
          animationPhase: wobble,
          motionIntent
        })
        : getRiftbornAnimationFrame({
          kind: enemy.kind,
          facingAngle: enemy.facingAngle ?? wobble,
          animationPhase: wobble,
          motionIntent
        });
      const spriteWidth = enemy.radius * spriteMeta.width
        * (1 + chargePower * 0.08 + contactPower * 0.08 + hitReact * 0.1 + guardPower * 0.035);
      const spriteHeight = enemy.radius * spriteMeta.height
        * (1 - contactPower * 0.07 + contactImpact * 0.06 + guardPower * 0.03);
      const count = isThreat ? threatCount : commonCount;
      const spriteRef = isThreat ? threatRef.current : commonRef.current;
      const shadowRef = isThreat ? threatShadowRef.current : commonShadowRef.current;
      const uvRef = isThreat ? threatUvRef.current : commonUvRef.current;
      const tintRef = isThreat ? threatTintRef.current : commonTintRef.current;

      const contactDisplacement = getEnemyContactDisplacement(enemy);
      const hitRecoil = -hitReact * enemy.radius * 0.12;
      local.forward.set(Math.sin(enemy.facingAngle ?? 0), 0, Math.cos(enemy.facingAngle ?? 0));
      local.pos.copy(enemy.pos).addScaledVector(local.forward, contactDisplacement + hitRecoil);
      local.pos.y = enemy.pos.y + spriteHeight * 0.5 + bob;
      local.quat.copy(state.camera.quaternion);
      local.scale.set(spriteWidth, spriteHeight, 1);
      local.matrix.compose(local.pos, local.quat, local.scale);
      spriteRef.setMatrixAt(count, local.matrix);
      uvRef.setXY(count, frame.offsetX, frame.offsetY);
      local.color.set(spriteMeta.tint).lerp(local.flashColor, hitReact * 0.48);
      tintRef.setXYZ(count, local.color.r, local.color.g, local.color.b);

      local.pos.set(enemy.pos.x, getTerrainHeight(enemy.pos.x, enemy.pos.z) + 0.055, enemy.pos.z);
      local.matrix.compose(
        local.pos,
        local.shadowQuat,
        local.scale.set(spriteWidth * 0.42, spriteWidth * 0.24, 1)
      );
      shadowRef.setMatrixAt(count, local.matrix);

      if (isThreat) threatCount += 1;
      else commonCount += 1;
    }

    commonUvRef.current.needsUpdate = true;
    commonTintRef.current.needsUpdate = true;
    threatUvRef.current.needsUpdate = true;
    threatTintRef.current.needsUpdate = true;
    syncInstanceMeshes([commonRef.current, commonShadowRef.current], commonCount);
    syncInstanceMeshes([threatRef.current, threatShadowRef.current], threatCount);
  });

  return (
    <group>
      <instancedMesh ref={commonShadowRef} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <circleGeometry args={[1, 18]} />
        <meshBasicMaterial color="#2d3d27" transparent opacity={0.16} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={commonRef} args={[null, null, MAX_ENEMIES]} material={commonMaterial} frustumCulled={false} renderOrder={4}>
        <planeGeometry args={[1, 1]}>
          <instancedBufferAttribute ref={commonUvRef} attach="attributes-instanceRuneUv" args={[new Float32Array(MAX_ENEMIES * 2), 2]} />
          <instancedBufferAttribute ref={commonTintRef} attach="attributes-instanceRuneTint" args={[new Float32Array(MAX_ENEMIES * 3), 3]} />
        </planeGeometry>
      </instancedMesh>
      <instancedMesh ref={threatShadowRef} args={[null, null, MAX_ENEMIES]} frustumCulled={false}>
        <circleGeometry args={[1, 22]} />
        <meshBasicMaterial color="#241c2e" transparent opacity={0.22} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={threatRef} args={[null, null, MAX_ENEMIES]} material={threatMaterial} frustumCulled={false} renderOrder={5}>
        <planeGeometry args={[1, 1]}>
          <instancedBufferAttribute ref={threatUvRef} attach="attributes-instanceRuneUv" args={[new Float32Array(MAX_ENEMIES * 2), 2]} />
          <instancedBufferAttribute ref={threatTintRef} attach="attributes-instanceRuneTint" args={[new Float32Array(MAX_ENEMIES * 3), 3]} />
        </planeGeometry>
      </instancedMesh>
    </group>
  );
}
