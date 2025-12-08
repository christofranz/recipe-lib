import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],

    // DIESER BLOCK IST NUR FÜR 'npm run dev' (LOKAL) RELEVANT.
    // Er wird beim Vercel-Build ('npm run build') ignoriert.
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
                secure: false,
            }
        }
    },

    // DIESER BLOCK IST FÜR DEN FINALEN BUILD WICHTIG.
    build: {
        outDir: 'dist', // Stellt sicher, dass die kompilierten Dateien im 'dist'-Ordner landen.
        emptyOutDir: true
    }
})