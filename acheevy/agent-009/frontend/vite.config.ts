import path from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss(), svgr()],

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        port: 1420,
        strictPort: true,
        watch: {
            // 3. tell vite to ignore watching `src-tauri`
            ignored: ['**/src-tauri/**']
        }
    },

    // Shadcn UI
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },

    // Production build — minify with esbuild (fast, safe), keep tree-shaking enabled.
    // Heavy deps that caused "Cannot add property 0" are isolated into their own chunks.
    build: {
        rollupOptions: {
            onwarn(warning, warn) {
                if (warning.code === 'CIRCULAR_DEPENDENCY') {
                    return
                }
                warn(warning)
            },
            output: {
                manualChunks(id) {
                    // Isolate heavy/problematic deps into separate chunks
                    if (id.includes('lottie-web') || id.includes('lottie-react')) {
                        return 'vendor-lottie'
                    }
                    if (id.includes('@react-three') || id.includes('three/')) {
                        return 'vendor-three'
                    }
                    if (id.includes('monaco-editor')) {
                        return 'vendor-monaco'
                    }
                    if (id.includes('mermaid') || id.includes('shiki')) {
                        return 'vendor-syntax'
                    }
                }
            }
        },

        target: 'esnext'
    }
})
