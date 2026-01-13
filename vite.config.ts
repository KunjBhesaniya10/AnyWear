
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

import { copyFileSync, existsSync, mkdirSync } from 'fs';

// Simple plugin to copy manifest.json to dist
const copyManifest = () => ({
  name: 'copy-manifest',
  closeBundle() {
    if (!existsSync('dist')) {
      mkdirSync('dist');
    }
    copyFileSync('manifest.json', 'dist/manifest.json');
  },
});

export default defineConfig({
  plugins: [react(), copyManifest()],
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: 'index.html',
        background: 'background.ts',
        content: 'content.ts',
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
});
