import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import dyadComponentTagger from '@dyad-sh/react-vite-component-tagger';

export default defineConfig(({mode}) => {
  return {
    plugins: [dyadComponentTagger(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5000,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: [
          '**/.local/**',
          '**/.cache/**',
          '**/.git/**',
          '**/.orchids/**',
          '**/.agents/**',
          '**/attached_assets/**',
        ],
      },
    },
  };
});
