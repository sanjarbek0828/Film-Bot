import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: '/webapp/',
  build: {
    outDir: '../public',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Vendor kutubxonalarni alohida chunk qilamiz — asosiy bundle kichrayadi,
        // brauzer keshi samaraliroq ishlaydi (kod o'zgarsa ham vendor qayta yuklanmaydi)
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'motion';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('react')) return 'react';
          }
        },
      },
    },
  },
});
