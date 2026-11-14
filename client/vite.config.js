import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'icons.svg',
        'offline.html',
        'icons/pwa-192x192.png',
        'icons/pwa-512x512.png',
        'icons/maskable-icon-512x512.png',
        'icons/apple-touch-icon.png',
        'icons/icon.svg',
      ],
      manifest: {
        name: 'Crave Food & Grocery Delivery',
        short_name: 'Crave',
        description: 'Instant 20-minute hyperlocal restaurant & fresh grocery delivery platform.',
        theme_color: '#FF6B35',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          },
        ],
        categories: ['food', 'shopping', 'lifestyle'],
      },
      workbox: {
        navigateFallback: '/offline.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        runtimeCaching: [
          // 1. External Media & Image Assets (Cloudinary & Unsplash) - CacheFirst
          {
            urlPattern: /^https:\/\/(images\.unsplash\.com|res\.cloudinary\.com).*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'crave-images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // 2. Google Web Fonts - CacheFirst
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'crave-google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 Year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // 3. API GET Requests (Catalog, Categories, Banners) - NetworkFirst
          {
            urlPattern: /^.*\/api\/(products|categories|banners).*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'crave-api-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});
