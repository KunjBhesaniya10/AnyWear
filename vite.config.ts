
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Fix: Derive __dirname in ESM environment as it is not globally available.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'background.ts'),
        content: resolve(__dirname, 'content.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Keep background and content scripts at the root with simple names
          if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
            return '[name].js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
});
