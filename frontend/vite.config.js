import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        signup: resolve(__dirname, 'signup.html'),
        thread: resolve(__dirname, 'thread.html'),
        'new-thread': resolve(__dirname, 'new-thread.html'),
      },
    },
  },
  server: {
    port: process.env.VITE_PORT || 5173,
    host: '0.0.0.0',
    strictPort: false,
  },
});
