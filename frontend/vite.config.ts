import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // sockjs-client (src/stomp-client.ts, Task 8) is CommonJS that references Node's implicit
    // `global` unguarded (e.g. lib/entry.js: `if ('_sockjs_onload' in global)`) — browsers have no
    // such global, and Vite doesn't polyfill it the way webpack/Browserify used to. Without this,
    // that reference throws `ReferenceError: global is not defined` at module-evaluation time,
    // before React ever renders — the entire app goes blank white, not just the sharing tab.
    define: {
      global: 'globalThis',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
