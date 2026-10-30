import fs from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const GSTATIC_MODELS_BASE = 'https://www.gstatic.com/aistudio/starter-apps/desk-racer/models';
const GLB_FILES = [
  'desk_props.glb',
  'kart_1to87.glb',
  'room_environment.glb',
  'track_coaster.glb',
];

function fetchGstaticModelsOnBuild(): Plugin {
  let outDir = 'dist';
  return {
    name: 'fetch-gstatic-models-on-build',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir || 'dist';
    },
    async closeBundle() {
      const assetsModelsDir = path.resolve(outDir, 'assets/models');
      const apiModelsDir = path.resolve(outDir, 'api/gstatic-models');
      await Promise.all([
        fs.mkdir(assetsModelsDir, { recursive: true }),
        fs.mkdir(apiModelsDir, { recursive: true }),
      ]);

      await Promise.all(
        GLB_FILES.map(async (file) => {
          const url = `${GSTATIC_MODELS_BASE}/${file}`;
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
          }
          const buffer = Buffer.from(await res.arrayBuffer());
          await Promise.all([
            fs.writeFile(path.join(assetsModelsDir, file), buffer),
            fs.writeFile(path.join(apiModelsDir, file), buffer),
          ]);
        })
      );
    },
  };
}

const gstaticModelsProxy = {
  '/api/gstatic-models': {
    target: 'https://www.gstatic.com',
    changeOrigin: true,
    rewrite: (reqPath: string) =>
      reqPath.replace(/^\/api\/gstatic-models/, '/aistudio/starter-apps/desk-racer/models'),
  },
  '/assets/models': {
    target: 'https://www.gstatic.com',
    changeOrigin: true,
    rewrite: (reqPath: string) =>
      reqPath.replace(/^\/assets\/models/, '/aistudio/starter-apps/desk-racer/models'),
  },
};

export default defineConfig({
  plugins: [
    fetchGstaticModelsOnBuild(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
      manifest: {
        id: '/',
        name: 'Desk Racer 3D',
        short_name: 'DeskRacer',
        description: 'Miniature desk coaster 3D time-trial racing game',
        theme_color: '#0b0c10',
        background_color: '#0b0c10',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,wav}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: gstaticModelsProxy,
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    proxy: gstaticModelsProxy,
  },
});
