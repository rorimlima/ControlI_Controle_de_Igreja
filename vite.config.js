import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        landing: resolve(__dirname, 'landing.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('@supabase')) return 'vendor';
          if (id.includes('chart.js')) return 'charts';
          if (id.includes('jspdf')) return 'pdf';
        }
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
});
