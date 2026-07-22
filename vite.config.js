import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        v2: resolve(__dirname, 'v2/index.html'),
        'symbol-library': resolve(__dirname, 'v2/symbol-library.html'),
        v3: resolve(__dirname, 'v3/index.html'),
        v4: resolve(__dirname, 'v4/index.html'),
        v5: resolve(__dirname, 'v5/index.html'),
        'v5-display': resolve(__dirname, 'v5/display.html'),
      },
    },
  },
});
