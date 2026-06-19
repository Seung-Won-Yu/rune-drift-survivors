import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'rune-drift-survivors';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? `/${repositoryName}/` : '/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('@react-three/postprocessing') || id.includes('/postprocessing/')) {
            return 'vendor-effects';
          }

          if (id.includes('@react-three/drei') || id.includes('camera-controls') || id.includes('maath')) {
            return 'vendor-drei';
          }

          if (id.includes('@react-three/fiber') || id.includes('zustand')) {
            return 'vendor-r3f';
          }

          if (id.includes('/three/') || id.includes('three-stdlib')) {
            return 'vendor-three';
          }

          if (id.includes('/react') || id.includes('/react-dom') || id.includes('/scheduler')) {
            return 'vendor-react';
          }

          return 'vendor';
        }
      }
    }
  }
});
