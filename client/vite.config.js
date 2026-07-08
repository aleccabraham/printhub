import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// NOTE: this dev server (`npm run dev:watch`) is intentionally NOT exposed to
// the LAN (host defaults to localhost) — the Vite/esbuild dev server has a
// known CORS vulnerability (GHSA-67mh-4wv8-2f99) that lets any website reached
// by a browser on the network read responses from it. The LAN-reachable path
// is `npm start` at the repo root, which builds the app and serves the static
// output + API from the Express server (see server/src/index.js) on one port.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // changeOrigin is deliberately left false (default) so the original Host
      // header (e.g. the LAN IP:5173 a student's browser used) is preserved
      // through to Express — the server uses it to build correct email links.
      '/api': {
        target: 'http://localhost:4000',
      },
      '/uploads': {
        target: 'http://localhost:4000',
      },
    },
  },
});
