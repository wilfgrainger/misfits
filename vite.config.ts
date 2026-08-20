import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const configuredClientId = '124399248491-l5t5oro70rfvbc360cpl26v59pgg6cf5.apps.googleusercontent.com';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(process.env.VITE_GOOGLE_CLIENT_ID ?? configuredClientId),
  },
  build: {
    outDir: 'dist',
  },
});
