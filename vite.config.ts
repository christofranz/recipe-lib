import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate', // Aktualisiert den Service Worker automatisch
            includeAssets: ['icon-192.png', 'icon-512.png', 'favicon.ico'], // Deine statischen Dateien
            manifest: {
                name: 'RecipeLib - One for all',
                short_name: 'RecipeLib',
                description: 'Meine persönliche Rezeptverwaltung',
                theme_color: '#000000',
                background_color: '#000000',
                display: 'standalone',
                start_url: '.',
                icons: [
                    {
                        src: 'icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: 'icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            },
            workbox: {
                // Hier lösen wir dein Notiz-Problem:
                runtimeCaching: [
                    {
                        // Alle API-Anfragen
                        urlPattern: ({ url }) => url.pathname.startsWith('/api'),
                        // NetworkFirst = Frag erst den Server, nimm Cache nur wenn offline
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 Woche
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        // Bilder (Rezepte) können ruhig aus dem Cache kommen (schneller)
                        urlPattern: ({ request }) => request.destination === 'image',
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'image-cache',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Tage
                            }
                        }
                    }
                ]
            }
        })
    ],
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
                secure: false,
            }
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true
    }
})