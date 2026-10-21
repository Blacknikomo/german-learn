import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The engine is linked during development, so Vite must not try to pre-bundle it: a rebuild of
  // the engine should show up on the next reload.
  optimizeDeps: { exclude: ['quiz-engine'] },
});
