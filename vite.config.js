// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/TestPlacesRender/',
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three';
          }
        },
      },
    },
  },
});