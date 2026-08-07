import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Vite runs inside the DDEV web container and is published to the host
    // through ddev-router (see web_extra_exposed_ports in .ddev/config.yaml).
    // Binding to localhost would make it unreachable from the host browser.
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    cors: true,
    hmr: {
      // The browser connects to the router's TLS endpoint, not to the
      // container directly, so the HMR socket has to be told where to dial.
      host: 'job-tracker.ddev.site',
      protocol: 'wss',
      clientPort: 5173,
    },
  },
})
