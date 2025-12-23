import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        embedded: resolve(__dirname, 'embedded.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('i18next')) return 'i18n';
            if (id.includes('firebase')) return 'firebase';
            if (id.includes('lucide-react') || id.includes('react-icons')) return 'icons';
            return 'vendor';
          }
          if (id.includes('/src/types/')) return 'types';
          if (id.includes('/src/constants/')) return 'types';
          if (id.includes('/src/solver/')) return 'solver';
          if (id.includes('/src/constraints/')) return 'constraints';
          if (id.includes('/src/components/dialogs/')) return 'dialogs';
          if (id.includes('/src/components/panels/')) return 'panels';
          if (id.includes('/src/components/canvas/')) return 'canvas';
          if (id.includes('/src/components/toolbar/')) return 'toolbar';
          if (id.includes('/src/components/')) return 'ui';
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
