import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // The engine is a symlink during development and carries React in its own node_modules for its
    // tests. Without this, its components get a second copy of React and every hook in them throws
    // "Cannot read properties of null (reading 'useState')" — which no test catches, because tests
    // run engine source in one process with one React.
    dedupe: ['react', 'react-dom'],
  },
  // A rebuild of the engine should show up on the next reload rather than from a pre-bundle.
  optimizeDeps: { exclude: ['quiz-engine'] },
});
