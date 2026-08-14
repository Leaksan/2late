import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// En production GitHub Pages, l'app est servie sous /2late/ ;
// en local (dev ou preview) elle reste servie à la racine.
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '2late — Annonces universitaires',
        short_name: '2late',
        description: 'Les annonces officielles et communautaires de l’université, centralisées, lisibles et vérifiées.',
        lang: 'fr',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        background_color: '#0E1116',
        theme_color: '#0E1116',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}']
      }
    })
  ]
});
