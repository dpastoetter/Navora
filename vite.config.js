import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/Navora/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
