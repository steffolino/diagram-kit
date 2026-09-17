import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves project sites from /<repo-name>/, not /. The
// GITHUB_REPOSITORY env var (owner/repo, set automatically in Actions) lets
// this stay correct without hardcoding the repo name; local dev/preview
// still serves from / since that var is unset outside CI.
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]

export default defineConfig({
  base: repoName ? `/${repoName}/` : '/',
  plugins: [react()],
})
