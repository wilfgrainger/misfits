import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const configuredClientId = '283865619073-pbgbcaoamje9rutnq7sq59fd9lmqrme3.apps.googleusercontent.com';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(process.env.VITE_GOOGLE_CLIENT_ID ?? configuredClientId),
  },
  build: {
    outDir: 'dist',
  },
});
