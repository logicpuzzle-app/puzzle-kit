import { defineConfig, mergeConfig } from 'vite';
import config from './vite.config';

// A separate local origin and no .env files: QA never needs Firebase credentials.
export default mergeConfig(config, defineConfig({ envDir: false }));
