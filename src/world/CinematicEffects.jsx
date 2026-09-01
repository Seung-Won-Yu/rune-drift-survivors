import { Suspense } from 'react';
import { Environment } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';

export default function CinematicEffects({ enableEnvironment, enablePostFx }) {
  return (
    <>
      {enableEnvironment && (
        <Suspense fallback={null}>
          <Environment preset="sunset" />
        </Suspense>
      )}
      {enablePostFx && (
        <EffectComposer>
          <Bloom luminanceThreshold={0.34} intensity={0.72} mipmapBlur />
          <Vignette eskil={false} offset={0.22} darkness={0.48} />
        </EffectComposer>
      )}
    </>
  );
}
