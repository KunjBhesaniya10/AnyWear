
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple plugin to copy manifest.json to dist
const copyManifest = () => ({
  name: 'copy-manifest',
  closeBundle() {
    if (!existsSync('dist')) {
      mkdirSync('dist');
    }
    copyFileSync('manifest.json', 'dist/manifest.json');
    console.log('\n✓ manifest.json copied to dist/');
  },
});

export default defineConfig({
  plugins: [react(), copyManifest()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'background.ts'),
        content: resolve(__dirname, 'content.ts'),
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
