import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'rune-drift-survivors';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? `/${repositoryName}/` : '/',
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        survivor: fileURLToPath(new URL('./survivor/index.html', import.meta.url))
      }
    }
  }
});
