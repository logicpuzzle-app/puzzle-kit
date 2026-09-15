import { defineConfig, mergeConfig, normalizePath } from 'vite';
import { resolve } from 'node:path';
import config from './vite.config';

// A separate local origin and no .env files: QA never needs Firebase credentials.
export default mergeConfig(config, defineConfig({
  envDir: false,
  // Stay inside this worktree even when its top-level node_modules is a symlink.
  // The node_modules segment also keeps optimized dependencies out of React HMR.
  cacheDir: resolve(__dirname, '.work/node_modules/.vite-qa'),
  server: {
    watch: {
      ignored: [
        '.work', 'docs/qa', 'artifacts', 'coverage', 'test-results', 'playwright-report',
      // Anchor to this root: the worktree itself may live inside a parent's .work.
      ].map(directory => `${normalizePath(resolve(__dirname, directory))}/**`),
    },
  },
}));
