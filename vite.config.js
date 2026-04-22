import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: true,
    rollupOptions: {
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
