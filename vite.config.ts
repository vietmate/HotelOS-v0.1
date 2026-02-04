import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // We use (process as any).cwd() to avoid TS errors if @types/node isn't perfectly resolved for config files in some environments.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // This ensures process.env.API_KEY works in the browser code by replacing it with the string value during build
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});