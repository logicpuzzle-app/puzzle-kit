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
        // Keep shared dependencies in Rollup's automatic chunks instead of
        // absorbing them into whichever manual UI chunk is visited first.
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/node_modules/pdfjs-dist/')) return 'pdf';
            if (id.includes('i18next')) return 'i18n';
            if (id.includes('firebase')) return 'firebase';
            if (id.includes('lucide-react') || id.includes('react-icons')) return 'icons';
            return 'vendor';
          }
          if (id.includes('/src/types/')) return 'types';
          if (id.includes('/src/constants/')) return 'types';
          if (id.includes('/src/solver/') || id.includes('/solver/')) return 'solver';
          if (id.includes('/src/constraints/')) return 'constraints';
          if (id.includes('/src/components/dialogs/')) return 'dialogs';
          if (id.includes('/src/components/panels/')) return 'panels';
          if (id.includes('/src/components/toolbar/')) return 'toolbar';
          // Layouts render the canvas; the canvas uses shared UI components.
          // Keep those mutually dependent modules in the same chunk.
          if (id.includes('/src/components/')) return 'ui';
          return undefined;
        },
      },
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    globals: true,
    environment: 'jsdom',
    // Bound jsdom/transform contention so the solver's cold import meets its timeout.
    maxWorkers: 2,
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/{utils,store,hooks,npgen}/**/*.{ts,tsx}'],
      exclude: ['**/*.{test,spec}.{ts,tsx}', '**/*.d.ts', '**/__tests__/**'],
    },
  },
})
