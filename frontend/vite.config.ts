/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite runs inside the DDEV web container and reaches the host browser through
// ddev-router, so the HMR socket has to dial the router's public endpoint
// rather than the container. Derive that from DDEV instead of hardcoding it:
// .ddev/ is untracked, so an environment recreated from README.md could
// legitimately use a different project name, and a hardcoded hostname would
// leave HMR pointing somewhere that does not exist.
//
// Falls back to localhost so `vite` still works if ever run outside DDEV.
const ddevUrl = process.env.DDEV_PRIMARY_URL_WITHOUT_PORT
const router = ddevUrl ? new URL(ddevUrl) : null

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Binding to localhost would make the server unreachable from outside
    // the container. Port must match web_extra_exposed_ports in
    // .ddev/config.yaml, and strictPort makes a mismatch fail loudly rather
    // than silently moving to a port the router is not forwarding.
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    cors: true,
    hmr: {
      host: router?.hostname ?? 'localhost',
      protocol: router?.protocol === 'https:' ? 'wss' : 'ws',
      clientPort: 5173,
    },
  },
  test: {
    // jsdom, not the real browser: these tests are about component behaviour
    // -- what renders, what a click does -- not layout or CSS. Browser-level
    // checks stay manual against the running app.
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // Vitest would otherwise treat the built output as source and try to run
    // anything test-shaped inside it.
    exclude: ['node_modules', 'dist'],
  },
})
