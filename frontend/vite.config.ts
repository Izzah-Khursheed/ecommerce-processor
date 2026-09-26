import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend dev server. It talks to the backend API via VITE_API_BASE
// (default http://localhost:3000). CORS is enabled on the backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
});
