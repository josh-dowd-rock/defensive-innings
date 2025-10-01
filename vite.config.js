import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For GitHub Pages project sites, Vite needs a non-root base path.
// This sets it automatically to '/<repo>/' on CI, and '/' locally.
const repoName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/').pop() : '';
const base = repoName ? `/${repoName}/` : '/';

export default defineConfig({
  plugins: [react()],
  base,
})
