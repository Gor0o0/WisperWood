import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    minify: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/whisperwood.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/whisperwood.css';
          }

          return 'assets/[name][extname]';
        },
      },
    },
  },
});
