import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { target: 'es2022', sourcemap: true },
  worker: { format: 'es' },
  // The only runtime dependency is an ESM web component, so it can be served directly.
  // Disabling Vite's optional optimizer avoids Dropbox locking node_modules/.vite mid-rename.
  optimizeDeps: { noDiscovery: true },
});
